export function ensureBlockStart(blockType, streamState) {
    if (blockType === 'thinking') {
        if (streamState.thinkingBlockIndex != null)
            return [];
        const idx = streamState.nextBlockIndex++;
        streamState.thinkingBlockIndex = idx;
        return [
            {
                type: 'content_block_start',
                index: idx,
                content_block: { type: 'thinking', thinking: '' }
            }
        ];
    }
    if (blockType === 'text') {
        if (streamState.textBlockIndex != null)
            return [];
        const idx = streamState.nextBlockIndex++;
        streamState.textBlockIndex = idx;
        return [
            {
                type: 'content_block_start',
                index: idx,
                content_block: { type: 'text', text: '' }
            }
        ];
    }
    return [];
}
export function stopBlock(index, streamState) {
    if (index == null)
        return [];
    if (streamState.stoppedBlocks.has(index))
        return [];
    streamState.stoppedBlocks.add(index);
    return [{ type: 'content_block_stop', index }];
}
export function createTextDeltaEvents(text, streamState) {
    if (!text)
        return [];
    const events = [];
    events.push(...ensureBlockStart('text', streamState));
    events.push({
        type: 'content_block_delta',
        index: streamState.textBlockIndex,
        delta: { type: 'text_delta', text }
    });
    return events;
}
export function createThinkingDeltaEvents(thinking, streamState) {
    const events = [];
    events.push(...ensureBlockStart('thinking', streamState));
    events.push({
        type: 'content_block_delta',
        index: streamState.thinkingBlockIndex,
        delta: { type: 'thinking_delta', thinking }
    });
    return events;
}
