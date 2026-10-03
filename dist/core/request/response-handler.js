import { restoreToolName } from '../../infrastructure/transformers/tool-transformer.js';
import { parseEventStream } from '../../plugin/response.js';
import { transformKiroStream } from '../../plugin/streaming/index.js';
import { transformSdkStream } from '../../plugin/streaming/sdk-stream-transformer.js';
export class ResponseHandler {
    async handleSuccess(response, model, conversationId, streaming, toolNameMap) {
        if (streaming) {
            return this.handleStreaming(response, model, conversationId, toolNameMap);
        }
        return this.handleNonStreaming(response, model, conversationId, toolNameMap);
    }
    async handleSdkSuccess(sdkResponse, model, conversationId, streaming, toolNameMap) {
        if (streaming) {
            return this.handleSdkStreaming(sdkResponse, model, conversationId, toolNameMap);
        }
        return this.handleSdkNonStreaming(sdkResponse, model, conversationId, toolNameMap);
    }
    async handleStreaming(response, model, conversationId, toolNameMap) {
        const s = transformKiroStream(response, model, conversationId, toolNameMap);
        return new Response(new ReadableStream({
            async start(c) {
                try {
                    for await (const e of s) {
                        c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`));
                    }
                    c.close();
                }
                catch (err) {
                    c.error(err);
                }
            }
        }), { headers: { 'Content-Type': 'text/event-stream' } });
    }
    async handleSdkStreaming(sdkResponse, model, conversationId, toolNameMap) {
        const s = transformSdkStream(sdkResponse, model, conversationId, toolNameMap);
        return new Response(new ReadableStream({
            async start(c) {
                try {
                    for await (const e of s) {
                        c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`));
                    }
                    c.close();
                }
                catch (err) {
                    c.error(err);
                }
            }
        }), { headers: { 'Content-Type': 'text/event-stream' } });
    }
    async handleNonStreaming(response, model, conversationId, toolNameMap) {
        const text = await response.text();
        const p = parseEventStream(text, model);
        const oai = {
            id: conversationId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
                {
                    index: 0,
                    message: { role: 'assistant', content: p.content },
                    finish_reason: p.stopReason === 'tool_use' ? 'tool_calls' : 'stop'
                }
            ],
            usage: {
                prompt_tokens: p.inputTokens || 0,
                completion_tokens: p.outputTokens || 0,
                total_tokens: (p.inputTokens || 0) + (p.outputTokens || 0)
            }
        };
        if (p.toolCalls.length > 0) {
            oai.choices[0].message.tool_calls = p.toolCalls.map((tc) => ({
                id: tc.toolUseId,
                type: 'function',
                function: {
                    name: restoreToolName(tc.name, toolNameMap),
                    arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input)
                }
            }));
        }
        return new Response(JSON.stringify(oai), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
    async handleSdkNonStreaming(sdkResponse, model, conversationId, toolNameMap) {
        // For non-streaming SDK responses, collect all events
        let content = '';
        const toolCallFragments = new Map();
        const toolCallOrder = [];
        let inputTokens = 0;
        let outputTokens = 0;
        const eventStream = sdkResponse.generateAssistantResponseResponse;
        if (eventStream) {
            for await (const event of eventStream) {
                if (event.assistantResponseEvent?.content) {
                    content += event.assistantResponseEvent.content;
                }
                if (event.toolUseEvent) {
                    const fragment = event.toolUseEvent;
                    const toolUseId = fragment.toolUseId;
                    if (typeof toolUseId === 'string' && toolUseId.length > 0) {
                        let accumulated = toolCallFragments.get(toolUseId);
                        if (!accumulated) {
                            accumulated = { toolUseId, input: '' };
                            toolCallFragments.set(toolUseId, accumulated);
                            toolCallOrder.push(toolUseId);
                        }
                        if (typeof fragment.name === 'string' && fragment.name.length > 0) {
                            accumulated.name = fragment.name;
                        }
                        if (fragment.input !== undefined) {
                            accumulated.input +=
                                typeof fragment.input === 'string'
                                    ? fragment.input
                                    : (JSON.stringify(fragment.input) ?? '');
                        }
                    }
                }
                if (event.metadataEvent?.tokenUsage) {
                    inputTokens = event.metadataEvent.tokenUsage.inputTokens || 0;
                    outputTokens = event.metadataEvent.tokenUsage.outputTokens || 0;
                }
            }
        }
        const toolCalls = toolCallOrder
            .map((toolUseId) => toolCallFragments.get(toolUseId))
            .filter((toolCall) => typeof toolCall?.name === 'string');
        const oai = {
            id: conversationId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
                {
                    index: 0,
                    message: { role: 'assistant', content },
                    finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop'
                }
            ],
            usage: {
                prompt_tokens: inputTokens,
                completion_tokens: outputTokens,
                total_tokens: inputTokens + outputTokens
            }
        };
        if (toolCalls.length > 0) {
            oai.choices[0].message.tool_calls = toolCalls.map((tc) => ({
                id: tc.toolUseId,
                type: 'function',
                function: {
                    name: restoreToolName(tc.name, toolNameMap),
                    arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input)
                }
            }));
        }
        return new Response(JSON.stringify(oai), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
