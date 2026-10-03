import { KiroAuthDetails, ManagedAccount } from './types.js'
export declare function fetchUsageLimits(auth: KiroAuthDetails): Promise<any>
export declare function summarizeUsage(
  usedCount: number,
  limitCount: number
): {
  used: number
  limit: number
  pct: number
}
export declare function updateAccountQuota(
  account: ManagedAccount,
  usage: any,
  accountManager?: any
): void
