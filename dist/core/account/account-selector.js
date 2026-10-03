import { KiroAuthError } from '../../plugin/errors.js';
import { summarizeUsage } from '../../plugin/usage.js';
export class AccountSelector {
    accountManager;
    config;
    syncFromKiroCli;
    repository;
    triedEmptySync = false;
    circuitBreakerTrips = 0;
    lastCircuitBreakerReset = Date.now();
    constructor(accountManager, config, syncFromKiroCli, repository) {
        this.accountManager = accountManager;
        this.config = config;
        this.syncFromKiroCli = syncFromKiroCli;
        this.repository = repository;
    }
    async selectHealthyAccount(showToast) {
        this.checkCircuitBreaker();
        let count = this.accountManager.getAccountCount();
        if (count === 0 && this.config.auto_sync_kiro_cli && !this.triedEmptySync) {
            this.triedEmptySync = true;
            await this.handleEmptyAccounts();
            count = this.accountManager.getAccountCount();
        }
        if (count === 0) {
            throw new KiroAuthError('Kiro is not authenticated. Sign in to the Kiro application or run opencode auth login --provider kiro.', 401);
        }
        let acc = this.accountManager.getCurrentOrNext();
        if (!acc) {
            this.circuitBreakerTrips++;
            const wait = this.accountManager.getMinWaitTime();
            if (wait > 0 && wait < 30000) {
                if (this.accountManager.shouldShowToast()) {
                    showToast(`All accounts rate-limited. Waiting ${Math.ceil(wait / 1000)}s...`, 'warning');
                }
                await this.sleep(wait);
                return null;
            }
            throw new Error('All accounts are unhealthy or rate-limited: reauth required');
        }
        this.resetCircuitBreaker();
        const used = acc.usedCount ?? 0;
        const limit = acc.limitCount ?? 0;
        if (limit > 0 && used / limit >= 0.9 && this.accountManager.shouldShowUsageToast()) {
            showToast(this.formatUsageMessage(used, limit, acc.email || ''), 'warning');
        }
        return acc;
    }
    async handleEmptyAccounts() {
        await this.syncFromKiroCli();
        this.repository.invalidateCache();
        const accounts = await this.repository.findAll();
        for (const a of accounts) {
            this.accountManager.addAccount(a);
        }
    }
    formatUsageMessage(usedCount, limitCount, email) {
        const { used, limit, pct } = summarizeUsage(usedCount, limitCount);
        return limit > 0 ? `Usage (${email}): ${used}/${limit} (${pct}%)` : `Usage (${email}): ${used}`;
    }
    checkCircuitBreaker() {
        if (Date.now() - this.lastCircuitBreakerReset > 60000) {
            this.circuitBreakerTrips = 0;
            this.lastCircuitBreakerReset = Date.now();
        }
        if (this.circuitBreakerTrips >= 10) {
            throw new Error('Circuit breaker tripped: Too many consecutive failures selecting accounts');
        }
    }
    resetCircuitBreaker() {
        if (this.circuitBreakerTrips > 0) {
            this.circuitBreakerTrips = 0;
            this.lastCircuitBreakerReset = Date.now();
        }
    }
    sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }
}
