import type { AccountManager } from './accounts.js'
export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  domain?: string
  publishedDate?: number
}
/**
 * Call Kiro's server-side `web_search` MCP tool with a fresh access token.
 * Returns parsed results, or throws with a readable message on failure.
 */
export declare function kiroWebSearch(
  accountManager: AccountManager,
  query: string
): Promise<WebSearchResult[]>
/** Render results as compact markdown for the model to consume. */
export declare function formatWebSearchResults(results: WebSearchResult[]): string
