import type { AccountRepository } from '../../infrastructure/database/account-repository.js'
import type { AccountManager } from '../../plugin/accounts.js'
import type { KiroAuthDetails, ManagedAccount } from '../../plugin/types.js'
type ToastFunction = (message: string, variant: 'info' | 'warning' | 'success' | 'error') => void
interface TokenRefresherConfig {
  token_expiry_buffer_ms: number
  auto_sync_kiro_cli: boolean
  account_selection_strategy: 'sticky' | 'round-robin' | 'lowest-usage'
}
export declare class TokenRefresher {
  private config
  private accountManager
  private syncFromKiroCli
  private repository
  constructor(
    config: TokenRefresherConfig,
    accountManager: AccountManager,
    syncFromKiroCli: () => Promise<void>,
    repository: AccountRepository
  )
  refreshIfNeeded(
    account: ManagedAccount,
    auth: KiroAuthDetails,
    showToast: ToastFunction
  ): Promise<{
    account: ManagedAccount
    shouldContinue: boolean
  }>
  forceRefresh(account: ManagedAccount, auth: KiroAuthDetails): Promise<void>
  private handleRefreshError
}
export {}
