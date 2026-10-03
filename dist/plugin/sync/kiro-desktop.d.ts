import type { ManagedAccount } from '../types.js'
export declare function getDesktopTokenPath(): string
export declare function getDesktopProfilePath(): string
/** Read Kiro's own session and selected profile without modifying either file. */
export declare function readKiroDesktopSession(profileOverride?: string): ManagedAccount | undefined
export declare function syncFromKiroDesktop(
  profileOverride?: string
): Promise<ManagedAccount | undefined>
