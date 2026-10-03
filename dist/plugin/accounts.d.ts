import type { AccountSelectionStrategy, KiroAuthDetails, ManagedAccount } from './types.js'
export declare function createDeterministicAccountId(
  email: string,
  method: string,
  clientId?: string,
  profileArn?: string
): string
export declare class AccountManager {
  private accounts
  private cursor
  private strategy
  private lastToastTime
  private lastUsageToastTime
  constructor(accounts: ManagedAccount[], strategy?: AccountSelectionStrategy)
  static loadFromDisk(strategy?: AccountSelectionStrategy): Promise<AccountManager>
  getAccountCount(): number
  getAccounts(): ManagedAccount[]
  shouldShowToast(debounce?: number): boolean
  shouldShowUsageToast(debounce?: number): boolean
  getMinWaitTime(): number
  getCurrentOrNext(): ManagedAccount | null
  updateUsage(
    id: string,
    meta: {
      usedCount: number
      limitCount: number
      email?: string
    }
  ): void
  addAccount(a: ManagedAccount): void
  removeAccount(a: ManagedAccount): void
  updateFromAuth(a: ManagedAccount, auth: KiroAuthDetails): void
  markRateLimited(a: ManagedAccount, ms: number): void
  markUnhealthy(a: ManagedAccount, reason: string, recovery?: number): void
  saveToDisk(): Promise<void>
  toAuthDetails(a: ManagedAccount): KiroAuthDetails
}
