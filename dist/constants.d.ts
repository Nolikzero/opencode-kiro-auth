import type { KiroRegion } from './plugin/types.js'
export declare function isValidRegion(region: string): region is KiroRegion
export declare function normalizeRegion(region: string | undefined): KiroRegion
export declare function buildUrl(template: string, region: KiroRegion): string
export declare function extractRegionFromArn(arn: string | undefined): KiroRegion | undefined
export declare const KIRO_CONSTANTS: {
  REFRESH_URL: string
  REFRESH_IDC_URL: string
  BASE_URL: string
  USAGE_LIMITS_URL: string
  DEFAULT_REGION: KiroRegion
  AXIOS_TIMEOUT: number
  USER_AGENT: string
  SDK_VERSION: string
  SDK_VERSION_USAGE: string
  CHAT_TRIGGER_TYPE_MANUAL: string
  ORIGIN_AI_EDITOR: string
}
export declare const MODEL_MAPPING: Record<string, string>
export declare const SUPPORTED_MODELS: string[]
export declare function isLongContextModel(model: string): boolean
export declare const KIRO_AUTH_SERVICE: {
  ENDPOINT: string
  SSO_OIDC_ENDPOINT: string
  BUILDER_ID_START_URL: string
  USER_INFO_URL: string
  SCOPES: string[]
}
