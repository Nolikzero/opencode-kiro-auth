import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Credential, Integration, Model, Plugin, Provider } from '@opencode/plugin'
import { KIRO_CONSTANTS } from './constants.js'
import { AuthHandler } from './core/auth/auth-handler.js'
import { TokenRefresher } from './core/auth/token-refresher.js'
import { RequestHandler } from './core/request/request-handler.js'
import { AccountCache } from './infrastructure/database/account-cache.js'
import { AccountRepository } from './infrastructure/database/account-repository.js'
import { AccountManager } from './plugin/accounts.js'
import { loadConfig } from './plugin/config/index.js'
import * as logger from './plugin/logger.js'
import { ModelCatalog } from './plugin/model-catalog.js'
import { registerDiscoveredModels } from './plugin/model-metadata.js'
import { buildModelRegistry } from './plugin/model-registry.js'
import { syncFromKiroCli } from './plugin/sync/kiro-cli.js'
import { syncFromKiroDesktop } from './plugin/sync/kiro-desktop.js'
import type { ManagedAccount } from './plugin/types.js'
import {
  WEB_SEARCH_DESCRIPTION,
  formatWebSearchResults,
  kiroWebSearch
} from './plugin/web-search.js'

const KIRO_PROVIDER_ID = 'kiro'
/** The `aisdk:` prefix routes the provider through the AI SDK hooks instead of a native package. */
const SDK_PACKAGE = '@ai-sdk/openai-compatible'
const PROVIDER_PACKAGE = `aisdk:${SDK_PACKAGE}`
const MODEL_REFRESH_INTERVAL_MS = 15 * 60 * 1000

/** Stable method IDs, in the order AuthHandler.getMethods() returns its methods. */
const METHOD_IDS = ['idc', 'idc-profile-arn', 'desktop'] as const

type Context = Plugin.Context
type IntegrationEditor = Parameters<Parameters<Context['integration']['transform']>[0]>[0]
type MethodRegistration = Parameters<IntegrationEditor['method']['update']>[0]
type OAuthRegistration = Extract<MethodRegistration, { authorize: unknown }>
type FormFields = NonNullable<OAuthRegistration['method']['form']>

interface DeviceAuthorization {
  url: string
  instructions: string
  method: 'auto' | 'code'
  callback: () => Promise<{ type: 'success'; key: string } | { type: 'failed' }>
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/**
 * Convert the registry used by the V1 plugin (OpenCode 1 config shape) into V2
 * model definitions. Variants become provider settings: the AI SDK spreads them into the
 * OpenAI-compatible body, so the request handler still sees `thinkingConfig` as in V1.
 */
export function toV2Models(providerID: string, registry: Record<string, unknown>): Model.Info[] {
  const provider = Provider.ID.make(providerID)
  return Object.entries(registry).map(([id, raw]) => {
    const spec = raw as {
      name: string
      limit: { context: number; output: number }
      modalities: { input: string[]; output: string[] }
      variants?: Record<string, unknown>
    }
    const base = Model.Info.default(provider, Model.ID.make(id))
    return {
      ...base,
      name: spec.name,
      capabilities: { tools: true, input: spec.modalities.input, output: spec.modalities.output },
      limit: spec.limit,
      variants: Object.entries(spec.variants ?? {}).map(([variant, body]) => ({
        id: Model.VariantID.make(variant),
        settings: body as Record<string, unknown>
      }))
    }
  })
}

export const createKiroV2Plugin = (id: string) =>
  Plugin.define({
    id,
    async setup(ctx) {
      const config = loadConfig(ctx.location.directory)
      // The V2 plugin context has no toast API outside TUI plugins, so notices go to the log.
      const notify = (message: string, variant: string) => {
        logger.log(`[${variant}] ${message}`)
      }

      const repository = new AccountRepository(new AccountCache(60000))
      const authHandler = new AuthHandler(config, repository)
      if (config.auto_sync_kiro_desktop) {
        try {
          await syncFromKiroDesktop(config.idc_profile_arn)
        } catch {
          logger.warn(
            'Kiro Desktop session import failed; use opencode auth login to choose a source'
          )
        }
      }
      const accountManager = await AccountManager.loadFromDisk(config.account_selection_strategy)
      authHandler.setAccountManager(accountManager)
      await authHandler.initialize(notify)

      const tokenRefresher = new TokenRefresher(config, accountManager, syncFromKiroCli, repository)
      const modelCatalog = new ModelCatalog({
        accounts: () => accountManager.getAccounts(),
        auth: async (account, forceRefresh) => {
          if (forceRefresh) {
            await tokenRefresher.forceRefresh(account, accountManager.toAuthDetails(account))
            return accountManager.toAuthDetails(account)
          }
          const refreshed = await tokenRefresher.refreshIfNeeded(
            account,
            accountManager.toAuthDetails(account),
            () => {}
          )
          if (!refreshed.account.isHealthy) throw new Error('Kiro account unavailable')
          return accountManager.toAuthDetails(refreshed.account)
        }
      })
      const requestHandler = new RequestHandler(accountManager, config, repository)

      const baseURL = KIRO_CONSTANTS.BASE_URL.replace('/generateAssistantResponse', '').replace(
        '{{region}}',
        config.default_region || 'us-east-1'
      )

      const loadModels = async () => {
        const catalog = await modelCatalog.load()
        if (catalog) registerDiscoveredModels(catalog)
        return toV2Models(id, buildModelRegistry(catalog))
      }
      const source = { models: await loadModels() }

      const providerID = Provider.ID.make(id)
      await ctx.provider.transform((editor) => {
        editor.add({
          info: {
            ...Provider.Info.empty(providerID),
            name: 'Kiro',
            // Credentials live in the plugin's own account store, so the provider is
            // always available and missing sign-in is reported by the request handler.
            activation: 'enabled',
            integrationID: Integration.ID.make(id),
            package: PROVIDER_PACKAGE,
            // Reasoning is streamed as `reasoning_content` deltas (see openai-converter).
            compatibility: { reasoningField: 'reasoning_content' }
          },
          models: source.models
        })
      })

      // Provider settings are cloned by the host and cannot carry functions, so the
      // SDK (with the request-intercepting fetch) is supplied through the AI SDK hook.
      await ctx.aisdk.hook(
        'sdk',
        (event) => {
          if (event.package !== SDK_PACKAGE) return
          event.sdk = createOpenAICompatible({
            name: id,
            baseURL,
            apiKey: '',
            fetch: ((input: any, init?: any) =>
              requestHandler.handle(input, init, notify)) as typeof fetch
          })
        },
        { providerID: id }
      )

      const refreshModels = async () => {
        source.models = await loadModels()
        await ctx.provider.reload()
      }

      // Sign-in flows. The prompts and validation come from AuthHandler so both
      // plugin generations stay in sync.
      const v1Methods = authHandler.getMethods()
      if (v1Methods.length !== METHOD_IDS.length) {
        throw new Error('Kiro auth methods and V2 method IDs are out of sync')
      }

      const findAccount = (credential: Credential.OAuth): ManagedAccount | undefined => {
        const accountID = (credential.metadata as { accountID?: string } | undefined)?.accountID
        return accountManager.getAccounts().find((account) => account.id === accountID)
      }

      let webSearchEnabled = false
      const syncWebSearch = async () => {
        const next = !!config.web_search_enabled && !!accountManager.getCurrentOrNext()?.profileArn
        if (next === webSearchEnabled) return
        webSearchEnabled = next
        await ctx.tool.reload()
      }

      const onSignedIn = async () => {
        await syncWebSearch()
        await refreshModels().catch((e) =>
          logger.warn('Kiro model refresh after sign-in failed', { error: String(e) })
        )
      }

      const registrations: MethodRegistration[] = v1Methods.map((method, index) => {
        const methodID = METHOD_IDS[index]!
        const prompts = (method.prompts ?? []).filter((prompt) => prompt.type === 'text')
        const form = prompts.map((prompt) => ({
          type: 'string' as const,
          key: prompt.key,
          title: prompt.message,
          ...(prompt.placeholder ? { placeholder: prompt.placeholder } : {}),
          required: false
        }))

        return {
          integrationID: id,
          method: {
            id: methodID,
            type: 'oauth' as const,
            label: method.label,
            ...(form.length ? { form: form as unknown as FormFields } : {})
          },
          authorize: async (answer) => {
            const inputs: Record<string, string> = {}
            for (const prompt of prompts) {
              const value = text(answer[prompt.key])
              const problem = 'validate' in prompt ? prompt.validate?.(value) : undefined
              if (problem) throw new Error(problem)
              inputs[prompt.key] = value
            }

            // Every Kiro method is an OAuth-type method, whose authorize returns this shape.
            const result = (await method.authorize!(inputs)) as unknown as DeviceAuthorization
            if (result.method !== 'auto') {
              throw new Error('Kiro sign-in only supports automatic completion')
            }

            const completed = (async (): Promise<Credential.OAuth> => {
              const outcome = await result.callback()
              if (outcome.type !== 'success' || !('key' in outcome)) {
                throw new Error('Kiro authentication failed')
              }
              const account = accountManager
                .getAccounts()
                .find((candidate) => candidate.accessToken === outcome.key)
              if (!account) throw new Error('Kiro account was not saved after sign-in')
              await onSignedIn()
              return {
                type: 'oauth',
                methodID: Integration.MethodID.make(methodID),
                refresh: account.refreshToken,
                access: account.accessToken,
                expires: Math.trunc(account.expiresAt),
                metadata: { accountID: account.id }
              }
            })()
            // The host awaits this later; avoid an unhandled rejection in between.
            completed.catch(() => {})

            return {
              url: result.url,
              instructions: result.instructions,
              mode: 'auto' as const,
              callback: completed
            }
          },
          // Token renewal is owned by the plugin's account store.
          refresh: async (credential: Credential.OAuth) => {
            const account = findAccount(credential)
            if (!account) throw new Error('Kiro account is no longer available; sign in again')
            const { account: usable } = await tokenRefresher.refreshIfNeeded(
              account,
              accountManager.toAuthDetails(account),
              () => {}
            )
            if (!usable.isHealthy) throw new Error('Kiro account needs to sign in again')
            return {
              ...credential,
              refresh: usable.refreshToken,
              access: usable.accessToken,
              expires: Math.trunc(usable.expiresAt)
            }
          },
          label: (credential: Credential.OAuth) => findAccount(credential)?.email
        } satisfies OAuthRegistration
      })

      await ctx.integration.transform((editor) => {
        editor.update(id, (integration) => {
          integration.name = 'Kiro'
        })
        registrations.forEach((registration) => editor.method.update(registration))
      })

      // Server-side web search is only offered to Pro accounts (those with a profileArn).
      await syncWebSearch()
      await ctx.tool.transform((editor) => {
        if (!webSearchEnabled) return
        editor.add({
          name: 'kiro_web_search',
          description: WEB_SEARCH_DESCRIPTION,
          input: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                maxLength: 200,
                description: 'The search query. Must be 200 characters or fewer.'
              }
            },
            required: ['query'],
            additionalProperties: false
          },
          async execute(input) {
            try {
              const results = await kiroWebSearch(
                accountManager,
                (input as { query: string }).query
              )
              return { content: formatWebSearchResults(results) }
            } catch (e) {
              return { content: `Web search failed: ${e instanceof Error ? e.message : String(e)}` }
            }
          }
        })
      })

      const timer = setInterval(() => {
        void refreshModels().catch((e) =>
          logger.warn('Kiro model refresh failed', { error: String(e) })
        )
      }, MODEL_REFRESH_INTERVAL_MS)
      timer.unref?.()
      return () => clearInterval(timer)
    }
  })

export const KiroV2Plugin = createKiroV2Plugin(KIRO_PROVIDER_ID)
