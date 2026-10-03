import { MODEL_MAPPING, SUPPORTED_MODELS, isLongContextModel } from '../constants.js';
export function resolveKiroModel(model) {
    const resolved = MODEL_MAPPING[model];
    if (!resolved) {
        throw new Error(`Unsupported model: ${model}. Supported models: ${SUPPORTED_MODELS.join(', ')}`);
    }
    return resolved;
}
export function getContextWindowSize(model) {
    return isLongContextModel(model) ? 1000000 : 200000;
}
