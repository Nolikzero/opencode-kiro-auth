import { CodeWhispererStreamingClient } from '@aws/codewhisperer-streaming-client';
import { KIRO_CONSTANTS } from '../constants.js';
const clientCache = new Map();
const KIRO_CLI_MAX_ATTEMPTS = 3;
export function createSdkClient(auth, region, effort, effortField = 'output_config') {
    const cacheKey = `${region}:${auth.email || 'default'}:${effort || 'none'}:${effortField}`;
    const cached = clientCache.get(cacheKey);
    if (cached && cached.token === auth.access && cached.effort === effort) {
        return cached.client;
    }
    const token = auth.access;
    const client = new CodeWhispererStreamingClient({
        region,
        endpoint: `https://runtime.${region}.kiro.dev`,
        token: () => Promise.resolve({ token }),
        maxAttempts: KIRO_CLI_MAX_ATTEMPTS,
        retryMode: 'standard',
        customUserAgent: [[KIRO_CONSTANTS.USER_AGENT]]
    });
    // Add Kiro-specific headers
    client.middlewareStack.add((next) => async (args) => {
        args.request.headers['x-amzn-kiro-agent-mode'] = 'vibe';
        if (auth.authMethod === 'idc')
            args.request.headers.TokenType = 'SSO_OIDC';
        return next(args);
    }, { step: 'build', name: 'addKiroHeaders' });
    // Inject additionalModelRequestFields for effort-based thinking control
    if (effort) {
        client.middlewareStack.add((next) => async (args) => {
            // The SDK serializes input to args.input, we need to modify the body
            // before it's sent. The body is in args.request.body as a string.
            if (args.request?.body) {
                try {
                    const body = JSON.parse(args.request.body);
                    body.additionalModelRequestFields = {
                        [effortField]: {
                            effort
                        }
                    };
                    args.request.body = JSON.stringify(body);
                }
                catch {
                    // If body parsing fails, continue without modification
                }
            }
            return next(args);
        }, { step: 'build', name: 'addEffortConfig', priority: 'high' });
    }
    clientCache.set(cacheKey, { client, token, effort });
    return client;
}
export function clearSdkClientCache() {
    for (const entry of clientCache.values()) {
        entry.client.destroy();
    }
    clientCache.clear();
}
