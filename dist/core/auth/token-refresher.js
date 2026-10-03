import { accessTokenExpired } from '../../kiro/auth.js';
import { KiroTokenRefreshError } from '../../plugin/errors.js';
import * as logger from '../../plugin/logger.js';
import { refreshAccessToken } from '../../plugin/token.js';
export class TokenRefresher {
    config;
    accountManager;
    syncFromKiroCli;
    repository;
    constructor(config, accountManager, syncFromKiroCli, repository) {
        this.config = config;
        this.accountManager = accountManager;
        this.syncFromKiroCli = syncFromKiroCli;
        this.repository = repository;
    }
    async refreshIfNeeded(account, auth, showToast) {
        if (!accessTokenExpired(auth, this.config.token_expiry_buffer_ms)) {
            return { account, shouldContinue: false };
        }
        try {
            const newAuth = await refreshAccessToken(auth);
            this.accountManager.updateFromAuth(account, newAuth);
            // Persist only the updated account instead of all accounts — avoids
            // invalidating the whole AccountCache on every token refresh.
            await this.repository.save(account);
            return { account, shouldContinue: false };
        }
        catch (e) {
            return await this.handleRefreshError(e, account, showToast);
        }
    }
    async forceRefresh(account, auth) {
        if (this.config.auto_sync_kiro_cli) {
            await this.syncFromKiroCli();
        }
        this.repository.invalidateCache();
        const accounts = await this.repository.findAll();
        const synced = accounts.find((a) => a.id === account.id);
        if (synced && synced.accessToken !== account.accessToken) {
            this.accountManager.updateFromAuth(account, this.accountManager.toAuthDetails(synced));
            await this.repository.batchSave(this.accountManager.getAccounts());
            logger.debug('Force refresh: recovered newer token from CLI sync');
            return;
        }
        try {
            const newAuth = await refreshAccessToken(auth);
            this.accountManager.updateFromAuth(account, newAuth);
            await this.repository.batchSave(this.accountManager.getAccounts());
            logger.debug('Force refresh: token refreshed via OIDC');
        }
        catch (e) {
            logger.warn('Force refresh failed, will retry with current token', {
                message: e instanceof Error ? e.message : String(e)
            });
        }
    }
    async handleRefreshError(error, account, showToast) {
        logger.error('Token refresh failed', {
            email: account.email,
            code: error instanceof KiroTokenRefreshError ? error.code : undefined,
            message: error instanceof Error ? error.message : String(error)
        });
        if (this.config.auto_sync_kiro_cli) {
            await this.syncFromKiroCli();
        }
        this.repository.invalidateCache();
        const accounts = await this.repository.findAll();
        const stillAcc = accounts.find((a) => a.id === account.id);
        if (stillAcc &&
            !accessTokenExpired(this.accountManager.toAuthDetails(stillAcc), this.config.token_expiry_buffer_ms)) {
            showToast('Credentials recovered from Kiro CLI sync.', 'info');
            return { account: stillAcc, shouldContinue: true };
        }
        if (error instanceof KiroTokenRefreshError &&
            (error.code === 'ExpiredTokenException' ||
                error.code === 'InvalidTokenException' ||
                error.code === 'ExpiredClientException' ||
                error.code === 'HTTP_401' ||
                error.code === 'HTTP_403' ||
                error.message.includes('Invalid refresh token provided') ||
                error.message.includes('Invalid grant provided') ||
                error.message.includes('Client is expired'))) {
            this.accountManager.markUnhealthy(account, error.code || error.message);
            await this.repository.batchSave(this.accountManager.getAccounts());
            return { account, shouldContinue: true };
        }
        logger.error('Token refresh unrecoverable', {
            email: account.email,
            code: error instanceof KiroTokenRefreshError ? error.code : undefined,
            message: error instanceof Error ? error.message : String(error)
        });
        throw error;
    }
}
