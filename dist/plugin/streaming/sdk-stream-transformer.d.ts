import type { ToolNameMap } from '../types.js'
export declare function transformSdkStream(
  sdkResponse: any,
  model: string,
  conversationId: string,
  toolNameMap?: ToolNameMap
): AsyncGenerator<any>
