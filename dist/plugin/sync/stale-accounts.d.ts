export type SyncedCliAccount = {
  id: string
  email: string
  authMethod: 'idc' | 'desktop'
  clientId?: string
  profileArn?: string
}
export declare const STALE_CLI_ACCOUNT_REASON =
  'InvalidTokenException: Replaced by active Kiro CLI account during sync'
export declare function getStaleKiroCliAccountIds(
  accounts: any[],
  syncedAccounts: SyncedCliAccount[]
): string[]
