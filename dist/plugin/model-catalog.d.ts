import { type ModelMetadata } from './model-metadata.js'
import type { KiroAuthDetails, ManagedAccount } from './types.js'
export declare class ModelCatalogHttpError extends Error {
  status: number
  constructor(status: number)
}
export declare function parseModelPage(data: unknown): {
  models: ModelMetadata[]
  nextToken?: string
}
/** The endpoint and schema match the installed Kiro IDE's control-plane client. */
export declare function fetchAvailableModels(
  auth: KiroAuthDetails,
  signal: AbortSignal,
  fetcher?: typeof fetch
): Promise<ModelMetadata[]>
interface ModelCatalogOptions {
  accounts: () => ManagedAccount[]
  auth: (account: ManagedAccount, forceRefresh: boolean) => Promise<KiroAuthDetails>
  cachePath?: string
  ttlMs?: number
  startupBudgetMs?: number
  requestTimeoutMs?: number
  now?: () => number
  fetcher?: typeof fetch
}
export declare class ModelCatalog {
  private options
  private path
  private now
  constructor(options: ModelCatalogOptions)
  private key
  private read
  private write
  private union
  private refresh
  load(): Promise<ModelMetadata[] | undefined>
}
export {}
