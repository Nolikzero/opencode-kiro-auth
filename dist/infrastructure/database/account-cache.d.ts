export declare class AccountCache {
  private cache
  private allAccountsCache
  private lastUpdate
  private ttl
  constructor(ttlMs?: number)
  getAll(): any[] | null
  setAll(accounts: any[]): void
  get(id: string): any | null
  set(id: string, account: any): void
  invalidate(id: string): void
  invalidateAll(): void
  private isExpired
}
