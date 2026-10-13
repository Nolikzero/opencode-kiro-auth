import { Model, Plugin } from '@opencode/plugin'
/**
 * Convert the registry used by the V1 plugin (OpenCode 1 config shape) into V2
 * model definitions. Variants become provider settings: the AI SDK spreads them into the
 * OpenAI-compatible body, so the request handler still sees `thinkingConfig` as in V1.
 */
export declare function toV2Models(
  providerID: string,
  registry: Record<string, unknown>
): Model.Info[]
export declare const createKiroV2Plugin: (id: string) => Plugin.Plugin
export declare const KiroV2Plugin: Plugin.Plugin
