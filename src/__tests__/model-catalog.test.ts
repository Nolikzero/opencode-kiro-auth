import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  fetchAvailableModels,
  ModelCatalog,
  ModelCatalogHttpError,
  parseModelPage
} from '../plugin/model-catalog.js'
import { clearDiscoveredModels } from '../plugin/model-metadata.js'
import { buildModelRegistry } from '../plugin/model-registry.js'
import { getContextWindowSize, resolveKiroModel } from '../plugin/models.js'
import { transformToSdkRequest } from '../plugin/request.js'
import type { KiroAuthDetails, ManagedAccount } from '../plugin/types.js'

const directories: string[] = []
function path() {
  const dir = mkdtempSync(join(tmpdir(), 'kiro-model-catalog-'))
  directories.push(dir)
  return join(dir, 'kiro-models.json')
}
afterEach(() => {
  clearDiscoveredModels()
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const auth: KiroAuthDetails = {
  access: 'secret-access-token',
  refresh: 'secret-refresh-token',
  expires: Date.now() + 3600000,
  authMethod: 'desktop',
  region: 'us-east-1',
  profileArn: 'arn:aws:codewhisperer:us-east-1:123:profile/example'
}
function account(id = 'one'): ManagedAccount {
  return {
    id,
    email: 'private@example.com',
    authMethod: auth.authMethod,
    region: auth.region,
    profileArn: auth.profileArn,
    accessToken: auth.access,
    refreshToken: auth.refresh,
    expiresAt: auth.expires,
    isHealthy: true,
    failCount: 0,
    rateLimitResetTime: 0
  }
}
const futureModel = {
  modelId: 'claude-fable-6.2',
  modelName: 'Claude Fable 6.2',
  rateMultiplier: 3.7,
  tokenLimits: { maxInputTokens: 2000000, maxOutputTokens: 128000 },
  supportedInputTypes: ['TEXT', 'IMAGE'],
  supportsPromptCache: true
}
const response = (models: unknown[] = [futureModel], more = {}) =>
  Response.json({ models, ...more })
const fetcher = (fn: (input: string, init: RequestInit) => Promise<Response> | Response) =>
  ((input: unknown, init: RequestInit) => Promise.resolve(fn(String(input), init))) as typeof fetch

describe('Kiro model API', () => {
  test('uses the native Kiro endpoint, profile region, and all pages', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const models = await fetchAvailableModels(
      { ...auth, profileArn: 'arn:aws:codewhisperer:eu-central-1:123:profile/test' },
      AbortSignal.timeout(1000),
      fetcher((url, init) => {
        calls.push({ url, init })
        const body = Object.fromEntries(new URL(url).searchParams)
        return body.nextToken
          ? response([futureModel])
          : response([{ modelId: 'auto', modelName: 'Auto' }], {
              defaultModel: { modelId: 'auto' },
              nextToken: 'next +/&'
            })
      })
    )
    expect(models.map((m) => m.modelId)).toEqual(['auto', 'claude-fable-6.2'])
    expect(calls).toHaveLength(2)
    expect(new URL(calls[0]!.url).origin).toBe('https://management.eu-central-1.kiro.dev')
    expect(new URL(calls[0]!.url).searchParams.get('origin')).toBe('AI_EDITOR')
    expect(new URL(calls[1]!.url).searchParams.get('nextToken')).toBe('next +/&')
    expect(calls[0]!.init.method).toBe('GET')
    const headers = new Headers(calls[0]!.init.headers)
    expect(headers.get('Authorization')).toBe('Bearer secret-access-token')
    expect(Object.fromEntries(new URL(calls[1]!.url).searchParams)).toMatchObject({
      origin: 'AI_EDITOR',
      profileArn: 'arn:aws:codewhisperer:eu-central-1:123:profile/test',
      nextToken: 'next +/&'
    })
  })

  test('does not retry metadata failures against the unrelated Amazon Q application', async () => {
    let calls = 0
    await expect(
      fetchAvailableModels(
        auth,
        AbortSignal.timeout(1000),
        fetcher(() => {
          calls++
          return new Response('', { status: 403 })
        })
      )
    ).rejects.toBeInstanceOf(ModelCatalogHttpError)
    expect(calls).toBe(1)
  })

  test('rejects missing model arrays and repeated pagination tokens', async () => {
    expect(() => parseModelPage({})).toThrow()
    await expect(
      fetchAvailableModels(
        auth,
        AbortSignal.timeout(1000),
        fetcher(() => response([futureModel], { nextToken: 'loop' }))
      )
    ).rejects.toThrow('Repeated Kiro model pagination token')
  })

  test('keeps full metadata over minimal defaults and strips unrelated fields', () => {
    const page = parseModelPage({
      models: [{ ...futureModel, accessToken: 'do-not-cache' }, { modelId: '__proto__' }],
      defaultModel: { modelId: futureModel.modelId }
    })
    expect(page.models).toEqual([futureModel])
  })
})

describe('dynamic registry and requests', () => {
  test('uses API metadata and forwards an unknown model without a plugin update', () => {
    const catalog = [
      futureModel,
      {
        modelId: 'gpt-6-luna',
        modelName: 'GPT 6 Luna',
        tokenLimits: { maxInputTokens: 1000000 }
      }
    ]
    const registry = buildModelRegistry(catalog) as Record<string, any>
    expect(Object.keys(registry)).toEqual(['claude-fable-6-2', 'gpt-6-luna'])
    expect(registry['claude-fable-6-2'].name).toBe('Claude Fable 6.2 (3.7x)')
    expect(registry['claude-fable-6-2'].limit).toEqual({ context: 2000000, output: 128000 })
    expect(registry['claude-fable-6-2'].modalities.input).toEqual(['text', 'image'])
    expect(registry['gpt-6-luna'].interleaved).toEqual({ field: 'reasoning_content' })
    expect(resolveKiroModel('claude-fable-6-2')).toBe('claude-fable-6.2')
    expect(getContextWindowSize('claude-fable-6.2')).toBe(2000000)
    const request = transformToSdkRequest(
      { messages: [{ role: 'user', content: 'hello' }] },
      'claude-fable-6-2',
      auth
    )
    expect(request.conversationState.currentMessage.userInputMessage?.modelId).toBe(
      'claude-fable-6.2'
    )
    expect(request.effort).toBeUndefined()
  })

  test('uses live schemas for future Claude and GPT effort variants', () => {
    const schema = (field: string, levels: string[]) => ({
      properties: {
        [field]: { properties: { effort: { enum: levels } } }
      }
    })
    const registry = buildModelRegistry([
      {
        ...futureModel,
        additionalModelRequestFieldsSchema: schema('output_config', ['low', 'medium', 'high'])
      },
      {
        modelId: 'gpt-6-luna',
        additionalModelRequestFieldsSchema: schema('reasoning', [
          'none',
          'low',
          'high',
          'xhigh',
          'max'
        ])
      }
    ]) as Record<string, any>
    expect(Object.keys(registry['claude-fable-6-2-thinking'].variants)).toEqual([
      'low',
      'medium',
      'high'
    ])
    expect(Object.keys(registry['gpt-6-luna-thinking'].variants)).toEqual([
      'low',
      'high',
      'xhigh',
      'max'
    ])
    const request = transformToSdkRequest(
      { messages: [{ role: 'user', content: 'hello' }] },
      'gpt-6-luna-thinking',
      auth,
      true,
      98304
    )
    expect(request.effort).toBe('xhigh')
    expect(request.effortField).toBe('reasoning')
  })

  test('parses nullable fields from the native Kiro API', () => {
    const page = parseModelPage({
      models: [
        {
          modelId: 'auto',
          modelName: null,
          supportedInputTypes: null,
          additionalModelRequestFieldsSchema: null
        }
      ],
      nextToken: null
    })
    expect(page.models[0]!.modelId).toBe('auto')
    expect(page.nextToken).toBeUndefined()
  })

  test('preserves known thinking variants while respecting authoritative availability', () => {
    const registry = buildModelRegistry([{ ...futureModel, modelId: 'claude-opus-5.5' }]) as Record<
      string,
      any
    >
    expect(Object.keys(registry)).toEqual(['claude-opus-5-5', 'claude-opus-5-5-thinking'])
    expect(registry['claude-opus-5-5-thinking'].variants.xhigh).toBeDefined()
    expect(resolveKiroModel('claude-opus-5-5-thinking')).toBe('claude-opus-5.5')
    expect(buildModelRegistry([])).toEqual({})
    expect(() => resolveKiroModel('model-never-advertised')).toThrow('Unsupported model')
  })
})

describe('model catalog cache', () => {
  test('persists metadata without credentials, then reads it without any API calls', async () => {
    const cachePath = path()
    let calls = 0
    const options = {
      cachePath,
      accounts: () => [account()],
      auth: async () => auth,
      fetcher: fetcher(() => {
        calls++
        return response()
      })
    }
    expect(await new ModelCatalog(options).load()).toEqual([futureModel])
    const saved = readFileSync(cachePath, 'utf8')
    expect(saved).not.toContain(auth.access)
    expect(saved).not.toContain(auth.refresh)
    expect(saved).not.toContain('private@example.com')
    expect(saved).not.toContain(auth.profileArn!)
    expect(await new ModelCatalog(options).load()).toEqual([futureModel])
    expect(calls).toBe(1)
  })

  test('deduplicates simultaneous refreshes and unions account catalogs', async () => {
    const cachePath = path()
    let calls = 0
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const options = {
      cachePath,
      accounts: () => [account('a'), account('b')],
      auth: async (a: ManagedAccount) => ({ ...auth, access: a.id }),
      fetcher: fetcher(async (_url, init) => {
        calls++
        await pending
        return response([
          {
            ...futureModel,
            modelId: new Headers(init.headers).get('Authorization')!.endsWith('a')
              ? 'model-a'
              : 'model-b'
          }
        ])
      })
    }
    const one = new ModelCatalog(options).load()
    const two = new ModelCatalog(options).load()
    release()
    const results = await Promise.all([one, two])
    expect(calls).toBe(2)
    expect(results[0]!.map((m) => m.modelId).sort()).toEqual(['model-a', 'model-b'])
    expect(results[1]).toEqual(results[0])
  })

  test('a slow API cannot hold startup and its result warms the next load', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const catalog = new ModelCatalog({
      cachePath: path(),
      accounts: () => [account()],
      auth: async () => auth,
      startupBudgetMs: 10,
      fetcher: fetcher(async () => {
        await pending
        return response()
      })
    })
    expect(await catalog.load()).toBeUndefined()
    release()
    expect(await catalog.load()).toEqual([futureModel])
  })

  test('returns stale cache immediately and retains it when refresh fails', async () => {
    let now = 100000
    let failed = false
    const options = {
      cachePath: path(),
      accounts: () => [account()],
      auth: async () => auth,
      now: () => now,
      ttlMs: 100,
      fetcher: fetcher(() => {
        if (failed) throw new TypeError('offline')
        return response()
      })
    }
    const catalog = new ModelCatalog(options)
    await catalog.load()
    now += 900000
    failed = true
    expect(await catalog.load()).toEqual([futureModel])
    // A partial/broken refresh never overwrites the last complete catalog.
    expect(readFileSync(options.cachePath, 'utf8')).toContain(futureModel.modelId)
  })

  test('does not use another account or profile snapshot', async () => {
    const cachePath = path()
    await new ModelCatalog({
      cachePath,
      accounts: () => [account('old')],
      auth: async () => auth,
      fetcher: fetcher(() => response())
    }).load()
    const fresh = new ModelCatalog({
      cachePath,
      accounts: () => [account('new')],
      auth: async () => auth,
      fetcher: fetcher(() => new Response('', { status: 429 }))
    })
    expect(await fresh.load()).toBeUndefined()
  })

  test('recovers a corrupt cache and retries authentication failures only once', async () => {
    const cachePath = path()
    writeFileSync(cachePath, '{broken')
    let calls = 0
    const forces: boolean[] = []
    const models = await new ModelCatalog({
      cachePath,
      accounts: () => [account()],
      auth: async (_a, force) => {
        forces.push(force)
        return auth
      },
      fetcher: fetcher(() => (++calls === 1 ? new Response('', { status: 401 }) : response()))
    }).load()
    expect(models).toEqual([futureModel])
    expect(calls).toBe(2)
    expect(forces).toEqual([false, true])
  })

  test('preserves fallback before sign-in and accepts an empty authoritative list', async () => {
    let calls = 0
    const catalog = new ModelCatalog({
      cachePath: path(),
      accounts: () => [],
      auth: async () => auth,
      fetcher: fetcher(() => {
        calls++
        return response()
      })
    })
    expect(await catalog.load()).toBeUndefined()
    expect(calls).toBe(0)
    const empty = new ModelCatalog({
      cachePath: path(),
      accounts: () => [account()],
      auth: async () => auth,
      fetcher: fetcher(() => response([]))
    })
    expect(await empty.load()).toEqual([])
  })
})
