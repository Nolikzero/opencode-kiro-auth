import type { AuthOuathResult } from '@opencode-ai/plugin'
import type { AccountRepository } from '../../infrastructure/database/account-repository.js'
export declare class IdcAuthMethod {
  private config
  private repository
  private accountManager
  constructor(config: any, repository: AccountRepository, accountManager: any)
  authorize(inputs?: Record<string, string>): Promise<AuthOuathResult>
}
