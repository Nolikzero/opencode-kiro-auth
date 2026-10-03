export { KiroOAuthPlugin } from './plugin.js'
export type { KiroConfig } from './plugin/config/index.js'
export type { KiroAuthMethod, KiroRegion, ManagedAccount } from './plugin/types.js'
declare const _default: {
  id: string
  server: ({ client, directory }: any) => Promise<{
    config: (input: any) => Promise<void>
    auth: {
      provider: string
      loader: (getAuth: any) => Promise<{
        apiKey: string
        baseURL: string
        fetch: (input: any, init?: any) => Promise<Response>
      }>
      methods: (
        | {
            type: 'oauth'
            label: string
            prompts?: Array<
              | {
                  type: 'text'
                  key: string
                  message: string
                  placeholder?: string
                  validate?: (value: string) => string | undefined
                  condition?: (inputs: Record<string, string>) => boolean
                  when?: {
                    key: string
                    op: 'eq' | 'neq'
                    value: string
                  }
                }
              | {
                  type: 'select'
                  key: string
                  message: string
                  options: Array<{
                    label: string
                    value: string
                    hint?: string
                  }>
                  condition?: (inputs: Record<string, string>) => boolean
                  when?: {
                    key: string
                    op: 'eq' | 'neq'
                    value: string
                  }
                }
            >
            authorize(
              inputs?: Record<string, string>
            ): Promise<import('@opencode-ai/plugin').AuthOAuthResult>
          }
        | {
            type: 'api'
            label: string
            prompts?: Array<
              | {
                  type: 'text'
                  key: string
                  message: string
                  placeholder?: string
                  validate?: (value: string) => string | undefined
                  condition?: (inputs: Record<string, string>) => boolean
                  when?: {
                    key: string
                    op: 'eq' | 'neq'
                    value: string
                  }
                }
              | {
                  type: 'select'
                  key: string
                  message: string
                  options: Array<{
                    label: string
                    value: string
                    hint?: string
                  }>
                  condition?: (inputs: Record<string, string>) => boolean
                  when?: {
                    key: string
                    op: 'eq' | 'neq'
                    value: string
                  }
                }
            >
            authorize?(inputs?: Record<string, string>): Promise<
              | {
                  type: 'success'
                  key: string
                  provider?: string
                  metadata?: Record<string, string>
                }
              | {
                  type: 'failed'
                }
            >
          }
      )[]
    }
    provider: {
      id: string
      models: (provider: any) => Promise<Record<string, any>>
    }
    tool: Record<string, any>
  }>
}
export default _default
