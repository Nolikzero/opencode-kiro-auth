import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { extractRegionFromArn } from '../constants.js';
import { getUserConfigPath } from './config/loader.js';
import * as logger from './logger.js';
import { ModelMetadataSchema } from './model-metadata.js';
const CacheEntrySchema = z.object({
    fetchedAt: z.number().finite().nonnegative(),
    models: z.array(ModelMetadataSchema).max(1024)
});
const CacheSchema = z.object({ version: z.literal(1), entries: z.record(CacheEntrySchema) });
export class ModelCatalogHttpError extends Error {
    status;
    constructor(status) {
        // Do not log response bodies, which can contain account identifiers.
        super(`ListAvailableModels returned HTTP ${status}`);
        this.status = status;
    }
}
export function parseModelPage(data) {
    const page = z
        .object({
        models: z.array(z.unknown()).max(1024),
        defaultModel: z.unknown().optional(),
        nextToken: z
            .string()
            .max(8192)
            .nullish()
            .transform((v) => v ?? undefined)
    })
        .parse(data);
    const models = new Map();
    // Prefer the full entry in models over a minimal defaultModel object.
    for (const raw of [...page.models, page.defaultModel]) {
        if (raw === undefined)
            continue;
        const result = ModelMetadataSchema.safeParse(raw);
        if (result.success && !models.has(result.data.modelId)) {
            models.set(result.data.modelId, result.data);
        }
    }
    if (page.models.length && !models.size)
        throw new Error('Invalid Kiro model metadata');
    return { models: [...models.values()], nextToken: page.nextToken || undefined };
}
/** The endpoint and schema match the installed Kiro IDE's control-plane client. */
export async function fetchAvailableModels(auth, signal, fetcher = fetch) {
    const region = extractRegionFromArn(auth.profileArn) ?? auth.region;
    const models = new Map();
    const seenTokens = new Set();
    let nextToken;
    for (let page = 0; page < 32; page++) {
        const url = new URL(`https://management.${region}.kiro.dev/List-Available-Models`);
        url.searchParams.set('origin', 'AI_EDITOR');
        url.searchParams.set('maxResults', '100');
        if (auth.profileArn)
            url.searchParams.set('profileArn', auth.profileArn);
        if (nextToken)
            url.searchParams.set('nextToken', nextToken);
        const response = await fetcher(url.toString(), {
            method: 'GET',
            signal,
            headers: {
                Authorization: `Bearer ${auth.access}`,
                ...(auth.authMethod === 'idc' ? { TokenType: 'SSO_OIDC' } : {}),
                'x-amzn-kiro-agent-mode': 'vibe',
                'amz-sdk-request': 'attempt=1; max=1',
                'amz-sdk-invocation-id': randomUUID(),
                'user-agent': 'KiroIDE'
            }
        });
        if (!response.ok)
            throw new ModelCatalogHttpError(response.status);
        const parsed = parseModelPage(await response.json());
        for (const model of parsed.models)
            models.set(model.modelId, model);
        nextToken = parsed.nextToken;
        if (!nextToken)
            return [...models.values()];
        if (seenTokens.has(nextToken))
            throw new Error('Repeated Kiro model pagination token');
        seenTokens.add(nextToken);
    }
    throw new Error('Kiro model catalog exceeds pagination limit');
}
const refreshes = new Map();
const lastAttempts = new Map();
export class ModelCatalog {
    options;
    path;
    now;
    constructor(options) {
        this.options = options;
        this.path = options.cachePath ?? join(dirname(getUserConfigPath()), 'kiro-models.json');
        this.now = options.now ?? Date.now;
    }
    key(account) {
        return createHash('sha256')
            .update(JSON.stringify([account.id, account.authMethod, account.region, account.profileArn ?? '']))
            .digest('hex');
    }
    read() {
        try {
            const text = readFileSync(this.path, 'utf8');
            if (text.length > 5_000_000)
                throw new Error('Oversized model cache');
            return CacheSchema.parse(JSON.parse(text));
        }
        catch {
            return { version: 1, entries: {} };
        }
    }
    write(key, models) {
        const cache = this.read();
        cache.entries[key] = { fetchedAt: this.now(), models };
        // Bound old account snapshots while preserving the most recent entries.
        cache.entries = Object.fromEntries(Object.entries(cache.entries)
            .sort((a, b) => b[1].fetchedAt - a[1].fetchedAt)
            .slice(0, 64));
        const temporary = `${this.path}.${randomUUID()}.tmp`;
        try {
            mkdirSync(dirname(this.path), { recursive: true });
            writeFileSync(temporary, JSON.stringify(cache), { mode: 0o600 });
            renameSync(temporary, this.path);
        }
        finally {
            try {
                unlinkSync(temporary);
            }
            catch { }
        }
    }
    union(accounts) {
        const cache = this.read();
        const models = new Map();
        let found = false;
        for (const account of accounts) {
            const entry = cache.entries[this.key(account)];
            if (!entry)
                continue;
            found = true;
            for (const model of entry.models)
                models.set(model.modelId, model);
        }
        return found ? [...models.values()] : undefined;
    }
    refresh(account) {
        const key = this.key(account);
        const flightKey = `${this.path}:${key}`;
        const running = refreshes.get(flightKey);
        if (running)
            return running;
        if (this.now() - (lastAttempts.get(flightKey) ?? -Infinity) < 60_000)
            return Promise.resolve();
        lastAttempts.set(flightKey, this.now());
        const work = (async () => {
            try {
                let auth = await this.options.auth(account, false);
                const signal = AbortSignal.timeout(this.options.requestTimeoutMs ?? 4000);
                let models;
                try {
                    models = await fetchAvailableModels(auth, signal, this.options.fetcher);
                }
                catch (error) {
                    if (!(error instanceof ModelCatalogHttpError) || ![401, 403].includes(error.status))
                        throw error;
                    auth = await this.options.auth(account, true);
                    models = await fetchAvailableModels(auth, signal, this.options.fetcher);
                }
                this.write(key, models);
                logger.log('Kiro model catalog refreshed', { count: models.length });
            }
            catch (error) {
                logger.warn('Kiro model discovery failed; retaining cached catalog', {
                    error: error instanceof ModelCatalogHttpError
                        ? error.message
                        : 'Network, credentials, or metadata unavailable'
                });
            }
        })().finally(() => refreshes.delete(flightKey));
        refreshes.set(flightKey, work);
        return work;
    }
    async load() {
        const accounts = this.options.accounts().filter((account) => account.isHealthy);
        if (!accounts.length)
            return undefined;
        const cache = this.read();
        const stale = accounts.filter((account) => {
            const entry = cache.entries[this.key(account)];
            return !entry || this.now() - entry.fetchedAt >= (this.options.ttlMs ?? 900_000);
        });
        if (!stale.length)
            return this.union(accounts);
        // Refresh accounts in the background, but let a fast first response populate
        // the current startup. A slow metadata endpoint never holds up OpenCode.
        const queue = [...stale];
        const worker = async () => {
            for (let account = queue.shift(); account; account = queue.shift()) {
                await this.refresh(account);
            }
        };
        const refresh = Promise.all([worker(), worker()]);
        const cached = this.union(accounts);
        if (cached !== undefined)
            return cached;
        let timer;
        try {
            await Promise.race([
                refresh,
                new Promise((resolve) => {
                    timer = setTimeout(resolve, this.options.startupBudgetMs ?? 1500);
                })
            ]);
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
        return this.union(accounts);
    }
}
