import { expect, test } from 'bun:test'
import { RequestHandler } from '../core/request/request-handler.js'
import { AccountManager } from '../plugin/accounts.js'
import { DEFAULT_CONFIG } from '../plugin/config/schema.js'

test('missing Kiro authentication returns a non-retryable 401 before any model request', async () => {
  const repository: any = { findAll: async () => [], invalidateCache: () => {} }
  const handler = new RequestHandler(
    new AccountManager([]),
    { ...DEFAULT_CONFIG, auto_sync_kiro_cli: false, auto_sync_kiro_desktop: false },
    repository
  )
  const response = await handler.handle(
    'https://runtime.eu-central-1.kiro.dev/chat/completions',
    {
      body: JSON.stringify({
        model: 'claude-opus-5-5',
        messages: [{ role: 'user', content: 'hello' }]
      })
    },
    () => {}
  )
  expect(response.status).toBe(401)
  expect((await response.json()).error).toMatchObject({
    type: 'authentication_error',
    code: 'authentication_required'
  })
})
