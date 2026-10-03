import type { AccountRepository } from '../../infrastructure/database/account-repository.js'
import type { AccountManager } from '../../plugin/accounts.js'
import type { ManagedAccount } from '../../plugin/types.js'
type ToastFunction = (message: string, variant: 'info' | 'warning' | 'success' | 'error') => void
interface AccountSelectorConfig {
  auto_sync_kiro_cli: boolean
  account_selection_strategy: 'sticky' | 'round-robin' | 'lowest-usage'
}
export declare class AccountSelector {
  private accountManager
  private config
  private syncFromKiroCli
  private repository
  private triedEmptySync
  private circuitBreakerTrips
  private lastCircuitBreakerReset
  constructor(
    accountManager: AccountManager,
    config: AccountSelectorConfig,
    syncFromKiroCli: () => Promise<void>,
    repository: AccountRepository
  )
  selectHealthyAccount(showToast: ToastFunction): Promise<ManagedAccount | null>
  private handleEmptyAccounts
  private formatUsageMessage
  private checkCircuitBreaker
  private resetCircuitBreaker
  private sleep
}
export {}
