import { kiroDb } from '../../plugin/storage/sqlite.js';
export class AccountRepository {
    cache;
    constructor(cache) {
        this.cache = cache;
    }
    async findAll() {
        const cached = this.cache.getAll();
        if (cached) {
            return cached;
        }
        const rows = kiroDb.getAccounts();
        const accounts = rows.map((r) => ({
            id: r.id,
            email: r.email,
            authMethod: r.auth_method,
            region: r.region,
            oidcRegion: r.oidc_region || undefined,
            clientId: r.client_id,
            clientSecret: r.client_secret,
            profileArn: r.profile_arn,
            startUrl: r.start_url || undefined,
            refreshToken: r.refresh_token,
            accessToken: r.access_token,
            expiresAt: r.expires_at,
            rateLimitResetTime: r.rate_limit_reset,
            isHealthy: r.is_healthy === 1,
            unhealthyReason: r.unhealthy_reason,
            recoveryTime: r.recovery_time,
            failCount: r.fail_count || 0,
            lastUsed: r.last_used,
            usedCount: r.used_count,
            limitCount: r.limit_count,
            lastSync: r.last_sync
        }));
        this.cache.setAll(accounts);
        return accounts;
    }
    async findById(id) {
        const cached = this.cache.get(id);
        if (cached) {
            return cached;
        }
        const accounts = await this.findAll();
        return accounts.find((a) => a.id === id) || null;
    }
    async save(account) {
        await kiroDb.upsertAccount(account);
        this.cache.invalidate(account.id);
    }
    async delete(id) {
        await kiroDb.deleteAccount(id);
        this.cache.invalidate(id);
    }
    async findHealthyAccounts() {
        const all = await this.findAll();
        return all.filter((a) => a.isHealthy);
    }
    async batchSave(accounts) {
        await kiroDb.batchUpsertAccounts(accounts);
        this.cache.invalidateAll();
    }
    invalidateCache() {
        this.cache.invalidateAll();
    }
}
