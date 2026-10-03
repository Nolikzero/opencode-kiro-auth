import * as logger from '../../plugin/logger.js';
import { fetchUsageLimits, updateAccountQuota } from '../../plugin/usage.js';
export class UsageTracker {
    config;
    accountManager;
    repository;
    lastSyncTime = new Map();
    cooldownMs;
    constructor(config, accountManager, repository) {
        this.config = config;
        this.accountManager = accountManager;
        this.repository = repository;
        this.cooldownMs = config.usage_sync_cooldown_ms ?? 60000;
    }
    async syncUsage(account, auth) {
        if (!this.config.usage_tracking_enabled)
            return;
        const last = this.lastSyncTime.get(account.id) ?? 0;
        if (Date.now() - last < this.cooldownMs)
            return;
        this.lastSyncTime.set(account.id, Date.now());
        this.syncWithRetry(account, auth, 0).catch((e) => {
            logger.warn('Usage sync failed after all retries', {
                accountId: account.id,
                error: e instanceof Error ? e.message : String(e)
            });
        });
    }
    // Fetch usage once and persist it, bypassing the cooldown/retry loop. Used by
    // the startup refresh, where the caller handles token refresh and fallback.
    async syncNow(account, auth) {
        const u = await fetchUsageLimits(auth);
        updateAccountQuota(account, u, this.accountManager);
        await this.repository.batchSave(this.accountManager.getAccounts());
    }
    async syncWithRetry(account, auth, attempt) {
        try {
            await this.syncNow(account, auth);
        }
        catch (e) {
            const msg = e?.message || '';
            // Don't retry rate-limit errors — that just amplifies the problem.
            const isRateLimit = msg.includes('429') ||
                msg.includes('ThrottlingException') ||
                msg.includes('TooManyRequests');
            if (!isRateLimit && attempt < this.config.usage_sync_max_retries) {
                await this.sleep(1000 * Math.pow(2, attempt));
                return this.syncWithRetry(account, auth, attempt + 1);
            }
            if (msg.includes('FEATURE_NOT_SUPPORTED')) {
                // Some IDC profiles don't expose getUsageLimits — not an error.
                return;
            }
            if (isRateLimit) {
                // Don't penalize the account; the request flow has its own 429 handler.
                logger.warn('Usage sync rate-limited; skipping until next cooldown', {
                    accountId: account.id
                });
                return;
            }
            if (msg.includes('403') || msg.includes('invalid') || msg.includes('bearer token')) {
                this.accountManager.markUnhealthy(account, msg);
                this.repository.save(account).catch(() => { });
            }
            throw e;
        }
    }
    sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }
}
