import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readKiroDesktopSession } from '../plugin/sync/kiro-desktop.js'

const originalTokenPath = process.env.KIRO_DESKTOP_TOKEN_PATH
const originalProfilePath = process.env.KIRO_DESKTOP_PROFILE_PATH
const dirs: string[] = []
afterEach(() => {
  if (originalTokenPath === undefined) delete process.env.KIRO_DESKTOP_TOKEN_PATH
  else process.env.KIRO_DESKTOP_TOKEN_PATH = originalTokenPath
  if (originalProfilePath === undefined) delete process.env.KIRO_DESKTOP_PROFILE_PATH
  else process.env.KIRO_DESKTOP_PROFILE_PATH = originalProfilePath
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'kiro-desktop-'))
  dirs.push(dir)
  process.env.KIRO_DESKTOP_TOKEN_PATH = join(dir, 'kiro-auth-token.json')
  process.env.KIRO_DESKTOP_PROFILE_PATH = join(dir, 'profile.json')
  return {
    dir,
    tokenPath: process.env.KIRO_DESKTOP_TOKEN_PATH,
    profilePath: process.env.KIRO_DESKTOP_PROFILE_PATH,
    token: {
      accessToken: 'access-secret',
      refreshToken: 'refresh-secret',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      region: 'us-east-1',
      authMethod: 'IdC',
      provider: 'Enterprise',
      clientIdHash: 'aabbccddeeff'
    }
  }
}
describe('Kiro Desktop session import', () => {
  test('reads the selected IDE profile and matching OIDC registration without modifying files', () => {
    const f = fixture()
    const profileArn = 'arn:aws:codewhisperer:eu-central-1:123:profile/IDE'
    writeFileSync(f.tokenPath, JSON.stringify(f.token))
    writeFileSync(f.profilePath, JSON.stringify({ arn: profileArn, name: 'Work' }))
    writeFileSync(
      join(f.dir, `${f.token.clientIdHash}.json`),
      JSON.stringify({ clientId: 'client', clientSecret: 'client-secret' })
    )
    const before = readFileSync(f.tokenPath, 'utf8')
    const account = readKiroDesktopSession()!
    expect(account.authMethod).toBe('idc')
    expect(account.region).toBe('eu-central-1')
    expect(account.oidcRegion).toBe('us-east-1')
    expect(account.profileArn).toBe(profileArn)
    expect(account.clientId).toBe('client')
    expect(account.clientSecret).toBe('client-secret')
    expect(account.accessToken).toBe('access-secret')
    expect(account.expiresAt).toBe(Date.parse(f.token.expiresAt))
    expect(readFileSync(f.tokenPath, 'utf8')).toBe(before)
  })
  test('supports social sessions and returns undefined when Kiro is not signed in', () => {
    const f = fixture()
    expect(readKiroDesktopSession()).toBeUndefined()
    writeFileSync(
      f.tokenPath,
      JSON.stringify({ ...f.token, authMethod: 'social', provider: 'Google' })
    )
    const account = readKiroDesktopSession()!
    expect(account.authMethod).toBe('desktop')
    expect(account.clientSecret).toBeUndefined()
  })
  test('requires the corporate profile and rejects path traversal in clientIdHash', () => {
    const f = fixture()
    writeFileSync(f.tokenPath, JSON.stringify({ ...f.token, clientIdHash: '../other-account' }))
    expect(() => readKiroDesktopSession()).toThrow('OIDC registration is missing')
    writeFileSync(f.tokenPath, JSON.stringify(f.token))
    writeFileSync(
      join(f.dir, `${f.token.clientIdHash}.json`),
      JSON.stringify({ clientId: 'client', clientSecret: 'secret' })
    )
    expect(() => readKiroDesktopSession()).toThrow('Select a profile')
    const account = readKiroDesktopSession(
      'arn:aws:codewhisperer:eu-central-1:123:profile/OVERRIDE'
    )!
    expect(account.region).toBe('eu-central-1')
  })
  test('reports malformed session data without exposing its contents', () => {
    const f = fixture()
    writeFileSync(f.tokenPath, JSON.stringify({ ...f.token, accessToken: '' }))
    expect(() => readKiroDesktopSession()).toThrow('Sign in to the Kiro application')
  })
})
