export class KiroTokenRefreshError extends Error {
    code;
    originalError;
    constructor(message, code, originalError) {
        super(message);
        this.name = 'KiroTokenRefreshError';
        this.code = code;
        this.originalError = originalError;
    }
}
export class KiroQuotaExhaustedError extends Error {
    recoveryTime;
    constructor(message, recoveryTime) {
        super(message);
        this.name = 'KiroQuotaExhaustedError';
        this.recoveryTime = recoveryTime;
    }
}
export class KiroRateLimitError extends Error {
    retryAfter;
    constructor(message, retryAfter) {
        super(message);
        this.name = 'KiroRateLimitError';
        this.retryAfter = retryAfter;
    }
}
export class KiroAuthError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.name = 'KiroAuthError';
        this.statusCode = statusCode;
    }
}
