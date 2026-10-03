import type { ManagedAccount } from '../types.js'
export declare function withDatabaseLock<T>(dbPath: string, fn: () => Promise<T>): Promise<T>
export declare function createDeterministicId(
  email: string,
  authMethod: string,
  clientId?: string,
  profileArn?: string
): string
export declare function mergeAccounts(
  existing: ManagedAccount[],
  incoming: ManagedAccount[]
): ManagedAccount[]
export declare function deduplicateAccounts(accounts: ManagedAccount[]): ManagedAccount[]
