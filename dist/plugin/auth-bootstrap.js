import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import * as logger from './logger.js';
import { getCliDbPath } from './sync/kiro-cli-parser.js';
import { readKiroDesktopSession } from './sync/kiro-desktop.js';
function getOpenCodeAuthPath() {
    const dataRoot = process.platform === 'win32'
        ? process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
        : process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
    return join(dataRoot, 'opencode', 'auth.json');
}
function readAuthFile(authPath) {
    if (!existsSync(authPath))
        return {};
    try {
        const parsed = JSON.parse(readFileSync(authPath, 'utf-8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            logger.warn('Bootstrap: auth.json is not an object, skipping placeholder auth setup');
            return null;
        }
        return parsed;
    }
    catch (e) {
        logger.warn(`Bootstrap: invalid auth.json, skipping placeholder auth setup: ${e instanceof Error ? e.message : String(e)}`);
        return null;
    }
}
function writeAuthFile(authPath, auth) {
    mkdirSync(dirname(authPath), { recursive: true });
    const mode = existsSync(authPath) ? statSync(authPath).mode & 0o777 : 0o600;
    const tempPath = `${authPath}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tempPath, JSON.stringify(auth, null, 2), { encoding: 'utf-8', mode });
    chmodSync(tempPath, mode);
    renameSync(tempPath, authPath);
}
/**
 * OpenCode only calls the auth loader when there is a stored auth entry for the
 * provider in auth.json. The plugin imports credentials from the Kiro IDE token cache or CLI
 * SQLite database, so it doesn't need the user to go through an OAuth flow first.
 *
 * This writes a minimal placeholder entry into auth.json so OpenCode calls the
 * loader, where real credentials are imported from the local Kiro session.
 */
export function bootstrapAuthIfNeeded(providerId, desktopEnabled = true, profileOverride) {
    try {
        const cliDbPath = getCliDbPath();
        if (!existsSync(cliDbPath) && !(desktopEnabled && readKiroDesktopSession(profileOverride))) {
            logger.debug('Bootstrap: no local Kiro session found, skipping');
            return;
        }
        const authPath = getOpenCodeAuthPath();
        const auth = readAuthFile(authPath);
        if (!auth)
            return;
        if (auth[providerId]) {
            return;
        }
        logger.log(`Bootstrap: writing placeholder auth entry for provider "${providerId}"`);
        auth[providerId] = {
            type: 'api',
            key: 'kiro-bootstrap-placeholder'
        };
        writeAuthFile(authPath, auth);
        logger.log('Bootstrap: auth.json updated — loader will run on next request');
    }
    catch (e) {
        logger.warn(`Bootstrap failed: ${e instanceof Error ? e.message : String(e)}`);
    }
}
