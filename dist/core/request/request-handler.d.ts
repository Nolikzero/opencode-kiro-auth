import type { AccountRepository } from '../../infrastructure/database/account-repository.js'
import type { AccountManager } from '../../plugin/accounts.js'
import type { KiroConfig } from '../../plugin/config/index.js'
type ToastFunction = (message: string, variant: 'info' | 'warning' | 'success' | 'error') => void
export declare class RequestHandler {
  private accountManager
  private config
  private repository
  private client?
  private accountSelector
  private tokenRefresher
  private errorHandler
  private responseHandler
  private usageTracker
  private retryStrategy
  private reauthInFlight
  private lastFailedReauthAt
  private static kiroRequestQueue
  constructor(
    accountManager: AccountManager,
    config: KiroConfig,
    repository: AccountRepository,
    client?: any | undefined
  )
  handle(input: any, init: any, showToast: ToastFunction): Promise<Response>
  private enqueueKiroRequest
  private handleKiroRequest
  private extractModel
  private prepareSdkRequest
  private handleSuccessfulRequest
  private logSdkRequest
  private logSdkResponse
  private logSdkError
  private triggerReauth
  private performReauth
  private hasUsableAccount
  private allAccountsPermanentlyUnhealthy
  private sleep
}
export {}
