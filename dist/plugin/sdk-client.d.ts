import { CodeWhispererStreamingClient } from '@aws/codewhisperer-streaming-client'
import type { Effort, KiroAuthDetails } from './types.js'
export declare function createSdkClient(
  auth: KiroAuthDetails,
  region: string,
  effort?: Effort,
  effortField?: 'output_config' | 'reasoning'
): CodeWhispererStreamingClient
export declare function clearSdkClientCache(): void
