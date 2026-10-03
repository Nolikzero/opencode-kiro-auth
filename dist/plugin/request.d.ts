import type { Effort, KiroAuthDetails, PreparedRequest, SdkPreparedRequest } from './types.js'
interface EffortConfig {
  effort?: Effort
  autoEffortMapping?: boolean
}
type ToastFunction = (message: string, variant: 'info' | 'warning' | 'success' | 'error') => void
export declare function transformToCodeWhisperer(
  url: string,
  body: any,
  model: string,
  auth: KiroAuthDetails,
  think?: boolean,
  budget?: number
): PreparedRequest
export declare function transformToSdkRequest(
  body: any,
  model: string,
  auth: KiroAuthDetails,
  think?: boolean,
  budget?: number,
  showToast?: ToastFunction,
  effortConfig?: EffortConfig
): SdkPreparedRequest
export {}
