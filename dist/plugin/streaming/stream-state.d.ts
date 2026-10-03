import { StreamEvent, StreamState } from './types.js'
export declare function ensureBlockStart(
  blockType: 'thinking' | 'text',
  streamState: StreamState
): StreamEvent[]
export declare function stopBlock(index: number | null, streamState: StreamState): StreamEvent[]
export declare function createTextDeltaEvents(text: string, streamState: StreamState): StreamEvent[]
export declare function createThinkingDeltaEvents(
  thinking: string,
  streamState: StreamState
): StreamEvent[]
