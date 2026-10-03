import { AccountCache } from './account-cache.js'
export declare class AccountRepository {
  private cache
  constructor(cache: AccountCache)
  findAll(): Promise<any[]>
  findById(id: string): Promise<any | null>
  save(account: any): Promise<void>
  delete(id: string): Promise<void>
  findHealthyAccounts(): Promise<any[]>
  batchSave(accounts: any[]): Promise<void>
  invalidateCache(): void
}
