export class AccountCache {
    cache = new Map();
    allAccountsCache = null;
    lastUpdate = 0;
    ttl;
    constructor(ttlMs = 60000) {
        this.ttl = ttlMs;
    }
    getAll() {
        if (this.isExpired()) {
            return null;
        }
        return this.allAccountsCache ? [...this.allAccountsCache] : null;
    }
    setAll(accounts) {
        this.allAccountsCache = [...accounts];
        this.lastUpdate = Date.now();
        for (const acc of accounts) {
            this.cache.set(acc.id, acc);
        }
    }
    get(id) {
        if (this.isExpired()) {
            return null;
        }
        return this.cache.get(id) || null;
    }
    set(id, account) {
        this.cache.set(id, account);
        this.lastUpdate = Date.now();
    }
    invalidate(id) {
        this.cache.delete(id);
        this.allAccountsCache = null;
    }
    invalidateAll() {
        this.cache.clear();
        this.allAccountsCache = null;
        this.lastUpdate = 0;
    }
    isExpired() {
        return Date.now() - this.lastUpdate > this.ttl;
    }
}
