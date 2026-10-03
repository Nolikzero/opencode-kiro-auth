import type { KiroAuthDetails, RefreshParts } from '../plugin/types.js'
export declare function decodeRefreshToken(refresh: string): RefreshParts
export declare function accessTokenExpired(auth: KiroAuthDetails, bufferMs?: number): boolean
export declare function encodeRefreshToken(parts: RefreshParts): string
