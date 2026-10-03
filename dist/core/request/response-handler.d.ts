import type { ToolNameMap } from '../../plugin/types.js'
export declare class ResponseHandler {
  handleSuccess(
    response: Response,
    model: string,
    conversationId: string,
    streaming: boolean,
    toolNameMap?: ToolNameMap
  ): Promise<Response>
  handleSdkSuccess(
    sdkResponse: any,
    model: string,
    conversationId: string,
    streaming: boolean,
    toolNameMap?: ToolNameMap
  ): Promise<Response>
  private handleStreaming
  private handleSdkStreaming
  private handleNonStreaming
  private handleSdkNonStreaming
}
