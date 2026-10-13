import type { AccountManager } from './accounts.js'
export declare const WEB_SEARCH_DESCRIPTION =
  "Search the web using Kiro's built-in search engine. Returns titles, URLs, snippets, domains, and publish dates for a query. Billed as Kiro credits.\n\n## When to Use\n- The user asks for current or up-to-date information (pricing, versions, release notes, recent events, library APIs).\n- Verifying facts that may have changed recently, or details likely newer than the model's training data.\n- Looking up specifics of a library, framework, or tool that can't be reliably inferred from the codebase or context.\n\n## When NOT to Use\n- Basic concepts, historical facts, or well-established programming syntax the model already knows.\n- Anything answerable from the current repository, files, or conversation. Search the codebase first.\n\n## Query Tips\n- Keep queries focused; the query MUST be 200 characters or fewer (longer queries are rejected).\n- Rephrase the user's request into effective keywords. Run multiple focused searches for complex questions rather than one broad query.\n- The snippets often contain enough to answer directly; only fetch a full page (via a separate fetch tool) when you need more detail.\n\n## Using Results & Attribution\n- Prioritize the most recently published, authoritative sources (prefer official docs over blogs; use the domain to judge authority).\n- ALWAYS cite sources with inline links in the format [description](url).\n- Paraphrase and summarize; do not reproduce more than ~30 consecutive words verbatim from any single source. Preserve factual accuracy while condensing."
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
