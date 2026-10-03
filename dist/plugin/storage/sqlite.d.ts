import type { ManagedAccount } from '../types.js'
export declare const DB_PATH: string
export declare class KiroDatabase {
  private db
  private path
  constructor(path?: string)
  private init
  getAccounts(): any[]
  private upsertAccountInternal
  upsertAccount(acc: ManagedAccount): Promise<void>
  batchUpsertAccounts(accounts: ManagedAccount[]): Promise<void>
  deleteAccount(id: string): Promise<void>
  markAccountsUnhealthy(ids: string[], reason: string): Promise<void>
  cleanupTestAndStaleAccounts(staleDays?: number): Promise<number>
  deleteStaleIdcDuplicates(canonicalId: string, email: string, profileArn: string): Promise<void>
  private rowToAccount
  close(): void
}
export declare function createDatabase(path?: string): KiroDatabase
export declare const kiroDb: KiroDatabase
