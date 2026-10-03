import type { ToolNameMap } from '../types.js'
export declare function transformKiroStream(
  response: Response,
  model: string,
  conversationId: string,
  toolNameMap?: ToolNameMap
): AsyncGenerator<any>
