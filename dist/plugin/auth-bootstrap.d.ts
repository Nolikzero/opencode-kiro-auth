/**
 * OpenCode only calls the auth loader when there is a stored auth entry for the
 * provider in auth.json. The plugin imports credentials from the Kiro IDE token cache or CLI
 * SQLite database, so it doesn't need the user to go through an OAuth flow first.
 *
 * This writes a minimal placeholder entry into auth.json so OpenCode calls the
 * loader, where real credentials are imported from the local Kiro session.
 */
export declare function bootstrapAuthIfNeeded(
  providerId: string,
  desktopEnabled?: boolean,
  profileOverride?: string
): void
