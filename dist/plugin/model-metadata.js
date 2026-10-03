import { z } from 'zod';
/** Only public model metadata is persisted; account credentials never enter the cache. */
export const ModelMetadataSchema = z.object({
    modelId: z
        .string()
        .min(1)
        .max(256)
        .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/),
    modelName: z
        .string()
        .max(512)
        .nullish()
        .transform((v) => v ?? undefined),
    rateMultiplier: z
        .number()
        .finite()
        .nonnegative()
        .nullish()
        .transform((v) => v ?? undefined),
    tokenLimits: z
        .object({
        maxInputTokens: z.number().int().positive().optional(),
        maxOutputTokens: z.number().int().positive().optional()
    })
        .nullish()
        .transform((v) => v ?? undefined),
    supportedInputTypes: z
        .array(z.string().max(32))
        .max(16)
        .nullish()
        .transform((v) => v ?? undefined),
    supportsPromptCache: z
        .boolean()
        .nullish()
        .transform((v) => v ?? undefined),
    additionalModelRequestFieldsSchema: z
        .record(z.unknown())
        .nullish()
        .transform((v) => v ?? undefined)
});
const discoveredModels = new Map();
export function toOpenCodeModelId(modelId) {
    // Keep existing OpenCode Claude IDs stable. Open-weight IDs already use dots.
    return modelId.startsWith('claude-') ? modelId.replaceAll('.', '-') : modelId;
}
export function registerDiscoveredModels(models) {
    for (const model of models) {
        discoveredModels.set(model.modelId, model);
        discoveredModels.set(toOpenCodeModelId(model.modelId), model);
    }
}
export function getDiscoveredModel(model) {
    return discoveredModels.get(model) ?? discoveredModels.get(model.replace(/-thinking$/, ''));
}
/** Separate plugin instances may share the resolver; catalogs are registered additively. */
export function clearDiscoveredModels() {
    discoveredModels.clear();
}
export function getModelEffortContract(model) {
    const schema = getDiscoveredModel(model)?.additionalModelRequestFieldsSchema;
    for (const field of ['output_config', 'reasoning']) {
        const values = schema?.properties?.[field]?.properties?.effort?.enum;
        if (!Array.isArray(values))
            continue;
        const levels = ['low', 'medium', 'high', 'xhigh', 'max'].filter((level) => values.includes(level));
        return { field, levels };
    }
}
