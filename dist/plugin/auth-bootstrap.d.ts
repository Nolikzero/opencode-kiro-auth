/**
 * OpenCode only calls the auth loader when there is a stored auth entry for the
 * provider in auth.json. The plugin syncs credentials from the Kiro IDE's local
 * SQLite database, so it doesn't need the user to go through an OAuth flow first.
 *
 * This writes a minimal placeholder entry into auth.json so OpenCode calls the
 * loader on the next startup, where real credentials are synced from Kiro CLI DB.
 */
export declare function bootstrapAuthIfNeeded(providerId: string): void
