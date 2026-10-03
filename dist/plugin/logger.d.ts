export declare function log(message: string, ...args: unknown[]): void
export declare function error(message: string, ...args: unknown[]): void
export declare function warn(message: string, ...args: unknown[]): void
export declare function debug(message: string, ...args: unknown[]): void
export declare function logApiRequest(data: any, timestamp: string): void
export declare function logApiResponse(data: any, timestamp: string): void
export declare function logApiError(requestData: any, responseData: any, timestamp: string): void
export declare function getTimestamp(): string
