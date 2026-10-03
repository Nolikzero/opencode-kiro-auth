interface RetryConfig {
  max_request_iterations: number
  request_timeout_ms: number
}
interface RetryContext {
  iterations: number
  startTime: number
}
export declare class RetryStrategy {
  private config
  constructor(config: RetryConfig)
  shouldContinue(context: RetryContext): {
    canContinue: boolean
    error?: string
  }
  createContext(): RetryContext
}
export {}
