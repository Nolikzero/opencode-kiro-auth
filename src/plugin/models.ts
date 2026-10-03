import { MODEL_MAPPING, SUPPORTED_MODELS, isLongContextModel } from '../constants'
import { getDiscoveredModel } from './model-metadata.js'

export function resolveKiroModel(model: string): string {
  const discovered = getDiscoveredModel(model)
  if (discovered) return discovered.modelId
  const resolved = MODEL_MAPPING[model]
  if (!resolved) {
    throw new Error(`Unsupported model: ${model}. Supported models: ${SUPPORTED_MODELS.join(', ')}`)
  }
  return resolved
}

export function getContextWindowSize(model: string): number {
  const discoveredLimit = getDiscoveredModel(model)?.tokenLimits?.maxInputTokens
  if (discoveredLimit) return discoveredLimit
  return isLongContextModel(model) ? 1000000 : 200000
}
