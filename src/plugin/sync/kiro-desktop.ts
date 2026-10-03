import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { extractRegionFromArn, normalizeRegion } from '../../constants.js'
import { createDeterministicAccountId } from '../accounts.js'
import * as logger from '../logger.js'
import { kiroDb } from '../storage/sqlite.js'
import type { ManagedAccount } from '../types.js'
import { makePlaceholderEmail, normalizeExpiresAt } from './kiro-cli-parser.js'

export function getDesktopTokenPath(): string {
  return (
    process.env.KIRO_DESKTOP_TOKEN_PATH ||
    join(homedir(), '.aws', 'sso', 'cache', 'kiro-auth-token.json')
  )
}

export function getDesktopProfilePath(): string {
  if (process.env.KIRO_DESKTOP_PROFILE_PATH) return process.env.KIRO_DESKTOP_PROFILE_PATH
  const root =
    process.platform === 'darwin'
      ? join(homedir(), 'Library', 'Application Support')
      : process.platform === 'win32'
        ? process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
        : process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(root, 'Kiro', 'User', 'globalStorage', 'kiro.kiroagent', 'profile.json')
}

function readJson(path: string): Record<string, any> | undefined {
  if (!existsSync(path)) return undefined
  const text = readFileSync(path, 'utf8')
  if (text.length > 1_000_000) throw new Error('Oversized Kiro session file')
  const data = JSON.parse(text)
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Invalid Kiro session file')
  return data
}

/** Read Kiro's own session and selected profile without modifying either file. */
export function readKiroDesktopSession(profileOverride?: string): ManagedAccount | undefined {
  const path = getDesktopTokenPath()
  const token = readJson(path)
  if (!token) return undefined
  if (
    typeof token.accessToken !== 'string' ||
    !token.accessToken ||
    typeof token.refreshToken !== 'string' ||
    !token.refreshToken
  ) {
    throw new Error('Kiro Desktop has no usable session. Sign in to the Kiro application first.')
  }
  const authMethod = String(token.authMethod).toLowerCase() === 'idc' ? 'idc' : 'desktop'
  let clientId: string | undefined
  let clientSecret: string | undefined
  if (authMethod === 'idc') {
    const hash = token.clientIdHash
    if (typeof hash !== 'string' || !/^[a-f0-9]{8,128}$/i.test(hash)) {
      throw new Error('Kiro Desktop OIDC registration is missing. Sign in to Kiro again.')
    }
    const registration = readJson(join(dirname(path), `${hash}.json`))
    if (!registration?.clientId || !registration.clientSecret) {
      throw new Error('Kiro Desktop OIDC credentials are missing. Sign in to Kiro again.')
    }
    clientId = registration.clientId
    clientSecret = registration.clientSecret
  }
  const profile = readJson(getDesktopProfilePath())
  const profileArn = profileOverride || token.profileArn || profile?.arn
  if (profileArn && !extractRegionFromArn(profileArn))
    throw new Error('Invalid Kiro Desktop profile ARN')
  if (authMethod === 'idc' && !profileArn) {
    throw new Error(
      'Select a profile in the Kiro application first, or set idc_profile_arn in kiro.json.'
    )
  }
  const region = extractRegionFromArn(profileArn) || normalizeRegion(token.region)
  const expiresAt = normalizeExpiresAt(token.expiresAt)
  if (!expiresAt) throw new Error('Kiro Desktop session expiry is missing. Sign in to Kiro again.')
  const email =
    typeof token.email === 'string' && token.email
      ? token.email
      : makePlaceholderEmail(authMethod, region, clientId, profileArn)
  return {
    id: createDeterministicAccountId(email, authMethod, clientId, profileArn),
    email,
    authMethod,
    region,
    oidcRegion: authMethod === 'idc' ? normalizeRegion(token.region) : undefined,
    clientId,
    clientSecret,
    profileArn,
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt,
    rateLimitResetTime: 0,
    isHealthy: true,
    failCount: 0
  }
}

export async function syncFromKiroDesktop(
  profileOverride?: string
): Promise<ManagedAccount | undefined> {
  const imported = readKiroDesktopSession(profileOverride)
  if (!imported) return undefined
  const existing = kiroDb
    .getAccounts()
    .find(
      (row) =>
        row.auth_method === imported.authMethod &&
        (imported.profileArn
          ? row.profile_arn === imported.profileArn
          : row.refresh_token === imported.refreshToken)
    )
  if (existing) {
    imported.id = existing.id
    imported.email = existing.email
    imported.usedCount = existing.used_count
    imported.limitCount = existing.limit_count
    // A plugin refresh can be newer than the IDE's cached token.
    if (existing.is_healthy === 1 && existing.expires_at > imported.expiresAt) {
      imported.accessToken = existing.access_token
      imported.refreshToken = existing.refresh_token
      imported.expiresAt = existing.expires_at
    }
  }
  await kiroDb.upsertAccount(imported)
  logger.debug('Kiro Desktop session imported', {
    region: imported.region,
    authMethod: imported.authMethod
  })
  return imported
}
