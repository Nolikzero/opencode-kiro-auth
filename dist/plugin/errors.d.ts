export declare class KiroTokenRefreshError extends Error {
  code?: string
  originalError?: Error
  constructor(message: string, code?: string, originalError?: Error)
}
export declare class KiroQuotaExhaustedError extends Error {
  recoveryTime?: number
  constructor(message: string, recoveryTime?: number)
}
export declare class KiroRateLimitError extends Error {
  retryAfter?: number
  constructor(message: string, retryAfter?: number)
}
export declare class KiroAuthError extends Error {
  statusCode?: number
  constructor(message: string, statusCode?: number)
}
