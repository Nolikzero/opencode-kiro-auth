import { GenerateAssistantResponseCommand } from '@aws/codewhisperer-streaming-client';
import { KiroAuthError } from '../../plugin/errors.js';
import { isPermanentError } from '../../plugin/health.js';
import * as logger from '../../plugin/logger.js';
import { transformToSdkRequest } from '../../plugin/request.js';
import { createSdkClient } from '../../plugin/sdk-client.js';
import { syncFromKiroCli } from '../../plugin/sync/kiro-cli.js';
import { AccountSelector } from '../account/account-selector.js';
import { UsageTracker } from '../account/usage-tracker.js';
import { TokenRefresher } from '../auth/token-refresher.js';
import { ErrorHandler } from './error-handler.js';
import { ResponseHandler } from './response-handler.js';
import { RetryStrategy } from './retry-strategy.js';
const KIRO_API_PATTERN = /^https?:\/\/(?:q\.[a-z0-9-]+\.amazonaws\.com|runtime\.[a-z0-9-]+\.kiro\.dev)(?:\/|$)/;
const REAUTH_FAILURE_COOLDOWN_MS = 60000;
export class RequestHandler {
    accountManager;
    config;
    repository;
    client;
    accountSelector;
    tokenRefresher;
    errorHandler;
    responseHandler;
    usageTracker;
    retryStrategy;
    reauthInFlight = null;
    lastFailedReauthAt = 0;
    static kiroRequestQueue = Promise.resolve();
    constructor(accountManager, config, repository, client) {
        this.accountManager = accountManager;
        this.config = config;
        this.repository = repository;
        this.client = client;
        this.accountSelector = new AccountSelector(accountManager, config, syncFromKiroCli, repository);
        this.tokenRefresher = new TokenRefresher(config, accountManager, syncFromKiroCli, repository);
        this.errorHandler = new ErrorHandler(config, accountManager, repository);
        this.responseHandler = new ResponseHandler();
        this.usageTracker = new UsageTracker(config, accountManager, repository);
        this.retryStrategy = new RetryStrategy(config);
    }
    async handle(input, init, showToast) {
        const url = typeof input === 'string' ? input : input.url;
        if (!KIRO_API_PATTERN.test(url)) {
            return fetch(input, init);
        }
        try {
            return await this.enqueueKiroRequest(() => this.handleKiroRequest(url, init, showToast));
        }
        catch (error) {
            if (!(error instanceof KiroAuthError))
                throw error;
            return Response.json({
                error: {
                    message: error.message,
                    type: 'authentication_error',
                    code: 'authentication_required'
                }
            }, { status: error.statusCode || 401 });
        }
    }
    async enqueueKiroRequest(run) {
        const previous = RequestHandler.kiroRequestQueue;
        let release;
        RequestHandler.kiroRequestQueue = new Promise((resolve) => {
            release = resolve;
        });
        await previous.catch(() => { });
        try {
            return await run();
        }
        finally {
            release();
        }
    }
    async handleKiroRequest(url, init, showToast) {
        const body = init?.body ? JSON.parse(init.body) : {};
        const model = this.extractModel(url) || body.model || 'claude-sonnet-4-5';
        const think = model.endsWith('-thinking') || !!body.providerOptions?.thinkingConfig || !!body.thinkingConfig;
        const budget = body.providerOptions?.thinkingConfig?.thinkingBudget ||
            body.thinkingConfig?.thinkingBudget ||
            body.thinkingConfig?.budget_tokens ||
            20000;
        let retry = 0;
        let bearerRetried = false;
        let consecutiveNullAccounts = 0;
        const retryContext = this.retryStrategy.createContext();
        while (true) {
            const check = this.retryStrategy.shouldContinue(retryContext);
            if (!check.canContinue) {
                throw new Error(check.error);
            }
            if (this.allAccountsPermanentlyUnhealthy()) {
                const reauthed = await this.triggerReauth(showToast);
                if (!reauthed) {
                    throw new Error('All accounts are permanently unhealthy. Please re-authenticate.');
                }
                continue;
            }
            let acc = await this.accountSelector.selectHealthyAccount(showToast).catch(async (e) => {
                if (e instanceof Error && e.message.includes('reauth required')) {
                    const reauthed = await this.triggerReauth(showToast);
                    if (!reauthed)
                        throw new Error('All accounts are unhealthy or rate-limited. Please re-authenticate.');
                    return null;
                }
                throw e;
            });
            if (!acc) {
                consecutiveNullAccounts++;
                const backoffDelay = Math.min(1000 * Math.pow(2, consecutiveNullAccounts - 1), 10000);
                await this.sleep(backoffDelay);
                continue;
            }
            consecutiveNullAccounts = 0;
            const auth = this.accountManager.toAuthDetails(acc);
            const tokenResult = await this.tokenRefresher.refreshIfNeeded(acc, auth, showToast);
            if (tokenResult.shouldContinue) {
                acc = tokenResult.account;
                await this.sleep(500);
                continue;
            }
            const sdkPrep = this.prepareSdkRequest(init?.body, model, auth, think, budget, showToast);
            const apiTimestamp = this.config.enable_log_api_request ? logger.getTimestamp() : null;
            if (apiTimestamp) {
                this.logSdkRequest(sdkPrep, acc, apiTimestamp);
            }
            try {
                const client = createSdkClient(auth, sdkPrep.region, sdkPrep.effort, sdkPrep.effortField);
                const command = new GenerateAssistantResponseCommand({
                    conversationState: sdkPrep.conversationState,
                    profileArn: sdkPrep.profileArn
                });
                const timeout = AbortSignal.timeout(this.config.request_timeout_ms);
                const sdkResponse = await client.send(command, {
                    abortSignal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
                });
                if (apiTimestamp) {
                    this.logSdkResponse(sdkPrep, apiTimestamp);
                }
                this.handleSuccessfulRequest(acc);
                this.usageTracker.syncUsage(acc, auth);
                return await this.responseHandler.handleSdkSuccess(sdkResponse, model, sdkPrep.conversationId, sdkPrep.streaming, sdkPrep.toolNameMap);
            }
            catch (e) {
                const httpStatus = e?.$metadata?.httpStatusCode;
                if (httpStatus && apiTimestamp) {
                    this.logSdkError(sdkPrep, e, acc, apiTimestamp);
                }
                if (httpStatus === 403 && !bearerRetried) {
                    const msg = e?.message || '';
                    if (msg.includes('bearer token included in the request is invalid') ||
                        msg.includes('The bearer token included in the request is invalid')) {
                        bearerRetried = true;
                        logger.warn('403 bearer invalid on first attempt, forcing token refresh and retrying');
                        await this.tokenRefresher.forceRefresh(acc, this.accountManager.toAuthDetails(acc));
                        continue;
                    }
                }
                if (httpStatus) {
                    const mockResponse = new Response(JSON.stringify({ message: e.message, __type: e.name }), {
                        status: httpStatus,
                        statusText: e.name || 'Error',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const errorResult = await this.errorHandler.handle(e, mockResponse, acc, { retry, bearerRetried }, showToast);
                    if (errorResult.shouldRetry) {
                        if (errorResult.newContext) {
                            retry = errorResult.newContext.retry;
                            bearerRetried = errorResult.newContext.bearerRetried ?? bearerRetried;
                        }
                        if (errorResult.forceRefresh) {
                            await this.tokenRefresher.forceRefresh(acc, this.accountManager.toAuthDetails(acc));
                        }
                        if (errorResult.switchAccount) {
                            continue;
                        }
                        continue;
                    }
                    const errMsg = e?.message || `Kiro Error: ${httpStatus}`;
                    if (/input is too long/i.test(errMsg)) {
                        return new Response(JSON.stringify({
                            error: {
                                message: 'input is too long for requested model',
                                type: 'invalid_request_error',
                                code: 'context_length_exceeded'
                            }
                        }), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    throw new Error(`Kiro Error: ${httpStatus}`);
                }
                const networkResult = await this.errorHandler.handleNetworkError(e, { retry }, showToast);
                if (networkResult.shouldRetry) {
                    if (networkResult.newContext) {
                        retry = networkResult.newContext.retry;
                    }
                    continue;
                }
                throw e;
            }
        }
    }
    extractModel(url) {
        return url.match(/models\/([^/:]+)/)?.[1] || null;
    }
    prepareSdkRequest(body, model, auth, think, budget, showToast) {
        return transformToSdkRequest(body, model, auth, think, budget, showToast, {
            effort: this.config.effort,
            autoEffortMapping: this.config.auto_effort_mapping
        });
    }
    handleSuccessfulRequest(acc) {
        if (acc.failCount && acc.failCount > 0) {
            if (!isPermanentError(acc.unhealthyReason)) {
                acc.failCount = 0;
                acc.isHealthy = true;
                delete acc.unhealthyReason;
                delete acc.recoveryTime;
                this.repository.save(acc).catch(() => { });
            }
        }
    }
    logSdkRequest(prep, acc, timestamp) {
        // Mirrors what the sdk-client middleware injects, so logs reflect the wire body.
        const additionalModelRequestFields = prep.effort
            ? { [prep.effortField || 'output_config']: { effort: prep.effort } }
            : undefined;
        logger.logApiRequest({
            url: `https://runtime.${prep.region}.kiro.dev/generateAssistantResponse`,
            method: 'POST',
            headers: { 'x-amzn-kiro-agent-mode': 'vibe' },
            body: {
                conversationState: {
                    chatTriggerType: prep.conversationState.chatTriggerType,
                    conversationId: prep.conversationState.conversationId,
                    historyLength: prep.conversationState.history?.length || 0,
                    currentMessage: prep.conversationState.currentMessage
                },
                profileArn: prep.profileArn,
                ...(additionalModelRequestFields ? { additionalModelRequestFields } : {})
            },
            conversationId: prep.conversationId,
            model: prep.effectiveModel,
            email: acc.email
        }, timestamp);
    }
    logSdkResponse(prep, timestamp) {
        logger.logApiResponse({
            status: 200,
            statusText: 'OK',
            headers: {},
            conversationId: prep.conversationId,
            model: prep.effectiveModel
        }, timestamp);
    }
    logSdkError(prep, error, acc, apiTimestamp) {
        const status = error?.$metadata?.httpStatusCode || 0;
        const rData = {
            status,
            statusText: error?.name || 'Error',
            headers: {},
            error: `Kiro Error: ${status} - ${error?.message || 'Unknown'}`,
            conversationId: prep.conversationId,
            model: prep.effectiveModel
        };
        if (!this.config.enable_log_api_request) {
            logger.logApiError({
                url: `https://runtime.${prep.region}.kiro.dev/generateAssistantResponse`,
                method: 'POST',
                headers: {},
                body: null,
                conversationId: prep.conversationId,
                model: prep.effectiveModel,
                email: acc.email
            }, rData, logger.getTimestamp());
        }
        else {
            logger.logApiResponse(rData, apiTimestamp);
        }
    }
    async triggerReauth(showToast) {
        if (!this.client)
            return false;
        const cooldownRemaining = REAUTH_FAILURE_COOLDOWN_MS - (Date.now() - this.lastFailedReauthAt);
        if (cooldownRemaining > 0) {
            showToast('Recent re-authentication failed. Please complete authentication manually.', 'error');
            return false;
        }
        if (this.reauthInFlight) {
            return this.reauthInFlight;
        }
        this.reauthInFlight = this.performReauth(showToast);
        const success = await this.reauthInFlight.finally(() => {
            this.reauthInFlight = null;
        });
        if (!success)
            this.lastFailedReauthAt = Date.now();
        return success;
    }
    async performReauth(showToast) {
        try {
            showToast('Session expired. Re-authenticating...', 'warning');
            await this.client.provider.oauth.authorize({
                path: { id: 'kiro' },
                body: { method: 0 }
            });
            await this.client.provider.oauth.callback({
                path: { id: 'kiro' },
                body: { method: 0 }
            });
            this.repository.invalidateCache();
            const accounts = await this.repository.findAll();
            for (const acc of accounts) {
                this.accountManager.addAccount(acc);
            }
            if (!this.hasUsableAccount(accounts)) {
                logger.warn('Re-auth completed but no usable Kiro account was found');
                showToast('Re-authentication completed but no usable Kiro account was found.', 'error');
                return false;
            }
            showToast('Re-authentication successful.', 'success');
            return true;
        }
        catch (e) {
            logger.error('Re-auth failed', e instanceof Error ? e : new Error(String(e)));
            return false;
        }
    }
    hasUsableAccount(accounts) {
        const now = Date.now();
        return accounts.some((acc) => acc.isHealthy && acc.expiresAt > now && !isPermanentError(acc.unhealthyReason));
    }
    allAccountsPermanentlyUnhealthy() {
        const accounts = this.accountManager.getAccounts();
        if (accounts.length === 0) {
            return false;
        }
        return accounts.every((acc) => !acc.isHealthy && isPermanentError(acc.unhealthyReason));
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
