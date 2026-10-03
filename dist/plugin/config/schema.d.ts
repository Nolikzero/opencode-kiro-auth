import { z } from 'zod'
export declare const AccountSelectionStrategySchema: z.ZodEnum<
  ['sticky', 'round-robin', 'lowest-usage']
>
export type AccountSelectionStrategy = z.infer<typeof AccountSelectionStrategySchema>
/**
 * Kiro effort levels control thinking/reasoning depth.
 * - low: minimal reasoning
 * - medium: balanced (default when thinking enabled)
 * - high: deeper reasoning
 * - xhigh: extended reasoning (xhigh-capable models only, see effort.ts)
 * - max: maximum reasoning depth (up to 128k thinking tokens on opus-4.8/opus-5)
 */
export declare const EffortSchema: z.ZodEnum<['low', 'medium', 'high', 'xhigh', 'max']>
export type Effort = z.infer<typeof EffortSchema>
export declare const RegionSchema: z.ZodEnum<
  [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'af-south-1',
    'ap-east-1',
    'ap-south-2',
    'ap-southeast-3',
    'ap-southeast-5',
    'ap-southeast-4',
    'ap-south-1',
    'ap-southeast-6',
    'ap-northeast-3',
    'ap-northeast-2',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-east-2',
    'ap-southeast-7',
    'ap-northeast-1',
    'ca-central-1',
    'ca-west-1',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-south-1',
    'eu-west-3',
    'eu-south-2',
    'eu-north-1',
    'eu-central-2',
    'il-central-1',
    'mx-central-1',
    'me-south-1',
    'me-central-1',
    'sa-east-1'
  ]
>
export type Region = z.infer<typeof RegionSchema>
export declare const KiroConfigSchema: z.ZodObject<
  {
    $schema: z.ZodOptional<z.ZodString>
    idc_start_url: z.ZodOptional<z.ZodString>
    idc_region: z.ZodOptional<
      z.ZodEnum<
        [
          'us-east-1',
          'us-east-2',
          'us-west-1',
          'us-west-2',
          'af-south-1',
          'ap-east-1',
          'ap-south-2',
          'ap-southeast-3',
          'ap-southeast-5',
          'ap-southeast-4',
          'ap-south-1',
          'ap-southeast-6',
          'ap-northeast-3',
          'ap-northeast-2',
          'ap-southeast-1',
          'ap-southeast-2',
          'ap-east-2',
          'ap-southeast-7',
          'ap-northeast-1',
          'ca-central-1',
          'ca-west-1',
          'eu-central-1',
          'eu-west-1',
          'eu-west-2',
          'eu-south-1',
          'eu-west-3',
          'eu-south-2',
          'eu-north-1',
          'eu-central-2',
          'il-central-1',
          'mx-central-1',
          'me-south-1',
          'me-central-1',
          'sa-east-1'
        ]
      >
    >
    idc_profile_arn: z.ZodOptional<z.ZodString>
    account_selection_strategy: z.ZodDefault<z.ZodEnum<['sticky', 'round-robin', 'lowest-usage']>>
    default_region: z.ZodDefault<
      z.ZodEnum<
        [
          'us-east-1',
          'us-east-2',
          'us-west-1',
          'us-west-2',
          'af-south-1',
          'ap-east-1',
          'ap-south-2',
          'ap-southeast-3',
          'ap-southeast-5',
          'ap-southeast-4',
          'ap-south-1',
          'ap-southeast-6',
          'ap-northeast-3',
          'ap-northeast-2',
          'ap-southeast-1',
          'ap-southeast-2',
          'ap-east-2',
          'ap-southeast-7',
          'ap-northeast-1',
          'ca-central-1',
          'ca-west-1',
          'eu-central-1',
          'eu-west-1',
          'eu-west-2',
          'eu-south-1',
          'eu-west-3',
          'eu-south-2',
          'eu-north-1',
          'eu-central-2',
          'il-central-1',
          'mx-central-1',
          'me-south-1',
          'me-central-1',
          'sa-east-1'
        ]
      >
    >
    rate_limit_retry_delay_ms: z.ZodDefault<z.ZodNumber>
    rate_limit_max_retries: z.ZodDefault<z.ZodNumber>
    max_request_iterations: z.ZodDefault<z.ZodNumber>
    request_timeout_ms: z.ZodDefault<z.ZodNumber>
    token_expiry_buffer_ms: z.ZodDefault<z.ZodNumber>
    usage_sync_max_retries: z.ZodDefault<z.ZodNumber>
    auth_server_port_start: z.ZodDefault<z.ZodNumber>
    auth_server_port_range: z.ZodDefault<z.ZodNumber>
    usage_tracking_enabled: z.ZodDefault<z.ZodBoolean>
    auto_sync_kiro_cli: z.ZodDefault<z.ZodBoolean>
    auto_sync_kiro_desktop: z.ZodDefault<z.ZodBoolean>
    enable_log_api_request: z.ZodDefault<z.ZodBoolean>
    /**
     * Default effort level for thinking models. Controls reasoning depth.
     * When set, this overrides the automatic budget-based mapping.
     * Values: 'low', 'medium', 'high', 'xhigh' (see XHIGH_CAPABLE_MODELS), 'max'
     */
    effort: z.ZodOptional<z.ZodEnum<['low', 'medium', 'high', 'xhigh', 'max']>>
    /**
     * Enable automatic effort mapping from OpenCode's thinking budget.
     * When true (default), maps budget ranges to effort levels.
     * When false, only uses explicit effort config or falls back to 'medium'.
     */
    auto_effort_mapping: z.ZodDefault<z.ZodBoolean>
    web_search_enabled: z.ZodDefault<z.ZodBoolean>
  },
  'strip',
  z.ZodTypeAny,
  {
    account_selection_strategy: 'sticky' | 'round-robin' | 'lowest-usage'
    default_region:
      | 'us-east-1'
      | 'us-east-2'
      | 'us-west-1'
      | 'us-west-2'
      | 'af-south-1'
      | 'ap-east-1'
      | 'ap-south-2'
      | 'ap-southeast-3'
      | 'ap-southeast-5'
      | 'ap-southeast-4'
      | 'ap-south-1'
      | 'ap-southeast-6'
      | 'ap-northeast-3'
      | 'ap-northeast-2'
      | 'ap-southeast-1'
      | 'ap-southeast-2'
      | 'ap-east-2'
      | 'ap-southeast-7'
      | 'ap-northeast-1'
      | 'ca-central-1'
      | 'ca-west-1'
      | 'eu-central-1'
      | 'eu-west-1'
      | 'eu-west-2'
      | 'eu-south-1'
      | 'eu-west-3'
      | 'eu-south-2'
      | 'eu-north-1'
      | 'eu-central-2'
      | 'il-central-1'
      | 'mx-central-1'
      | 'me-south-1'
      | 'me-central-1'
      | 'sa-east-1'
    rate_limit_retry_delay_ms: number
    rate_limit_max_retries: number
    max_request_iterations: number
    request_timeout_ms: number
    token_expiry_buffer_ms: number
    usage_sync_max_retries: number
    auth_server_port_start: number
    auth_server_port_range: number
    usage_tracking_enabled: boolean
    auto_sync_kiro_cli: boolean
    auto_sync_kiro_desktop: boolean
    enable_log_api_request: boolean
    auto_effort_mapping: boolean
    web_search_enabled: boolean
    $schema?: string | undefined
    idc_start_url?: string | undefined
    idc_region?:
      | 'us-east-1'
      | 'us-east-2'
      | 'us-west-1'
      | 'us-west-2'
      | 'af-south-1'
      | 'ap-east-1'
      | 'ap-south-2'
      | 'ap-southeast-3'
      | 'ap-southeast-5'
      | 'ap-southeast-4'
      | 'ap-south-1'
      | 'ap-southeast-6'
      | 'ap-northeast-3'
      | 'ap-northeast-2'
      | 'ap-southeast-1'
      | 'ap-southeast-2'
      | 'ap-east-2'
      | 'ap-southeast-7'
      | 'ap-northeast-1'
      | 'ca-central-1'
      | 'ca-west-1'
      | 'eu-central-1'
      | 'eu-west-1'
      | 'eu-west-2'
      | 'eu-south-1'
      | 'eu-west-3'
      | 'eu-south-2'
      | 'eu-north-1'
      | 'eu-central-2'
      | 'il-central-1'
      | 'mx-central-1'
      | 'me-south-1'
      | 'me-central-1'
      | 'sa-east-1'
      | undefined
    idc_profile_arn?: string | undefined
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined
  },
  {
    $schema?: string | undefined
    idc_start_url?: string | undefined
    idc_region?:
      | 'us-east-1'
      | 'us-east-2'
      | 'us-west-1'
      | 'us-west-2'
      | 'af-south-1'
      | 'ap-east-1'
      | 'ap-south-2'
      | 'ap-southeast-3'
      | 'ap-southeast-5'
      | 'ap-southeast-4'
      | 'ap-south-1'
      | 'ap-southeast-6'
      | 'ap-northeast-3'
      | 'ap-northeast-2'
      | 'ap-southeast-1'
      | 'ap-southeast-2'
      | 'ap-east-2'
      | 'ap-southeast-7'
      | 'ap-northeast-1'
      | 'ca-central-1'
      | 'ca-west-1'
      | 'eu-central-1'
      | 'eu-west-1'
      | 'eu-west-2'
      | 'eu-south-1'
      | 'eu-west-3'
      | 'eu-south-2'
      | 'eu-north-1'
      | 'eu-central-2'
      | 'il-central-1'
      | 'mx-central-1'
      | 'me-south-1'
      | 'me-central-1'
      | 'sa-east-1'
      | undefined
    idc_profile_arn?: string | undefined
    account_selection_strategy?: 'sticky' | 'round-robin' | 'lowest-usage' | undefined
    default_region?:
      | 'us-east-1'
      | 'us-east-2'
      | 'us-west-1'
      | 'us-west-2'
      | 'af-south-1'
      | 'ap-east-1'
      | 'ap-south-2'
      | 'ap-southeast-3'
      | 'ap-southeast-5'
      | 'ap-southeast-4'
      | 'ap-south-1'
      | 'ap-southeast-6'
      | 'ap-northeast-3'
      | 'ap-northeast-2'
      | 'ap-southeast-1'
      | 'ap-southeast-2'
      | 'ap-east-2'
      | 'ap-southeast-7'
      | 'ap-northeast-1'
      | 'ca-central-1'
      | 'ca-west-1'
      | 'eu-central-1'
      | 'eu-west-1'
      | 'eu-west-2'
      | 'eu-south-1'
      | 'eu-west-3'
      | 'eu-south-2'
      | 'eu-north-1'
      | 'eu-central-2'
      | 'il-central-1'
      | 'mx-central-1'
      | 'me-south-1'
      | 'me-central-1'
      | 'sa-east-1'
      | undefined
    rate_limit_retry_delay_ms?: number | undefined
    rate_limit_max_retries?: number | undefined
    max_request_iterations?: number | undefined
    request_timeout_ms?: number | undefined
    token_expiry_buffer_ms?: number | undefined
    usage_sync_max_retries?: number | undefined
    auth_server_port_start?: number | undefined
    auth_server_port_range?: number | undefined
    usage_tracking_enabled?: boolean | undefined
    auto_sync_kiro_cli?: boolean | undefined
    auto_sync_kiro_desktop?: boolean | undefined
    enable_log_api_request?: boolean | undefined
    effort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined
    auto_effort_mapping?: boolean | undefined
    web_search_enabled?: boolean | undefined
  }
>
export type KiroConfig = z.infer<typeof KiroConfigSchema>
export declare const DEFAULT_CONFIG: KiroConfig
