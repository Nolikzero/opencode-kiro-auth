import { z } from 'zod'
/** Only public model metadata is persisted; account credentials never enter the cache. */
export declare const ModelMetadataSchema: z.ZodObject<
  {
    modelId: z.ZodString
    modelName: z.ZodEffects<
      z.ZodOptional<z.ZodNullable<z.ZodString>>,
      string | undefined,
      string | null | undefined
    >
    rateMultiplier: z.ZodEffects<
      z.ZodOptional<z.ZodNullable<z.ZodNumber>>,
      number | undefined,
      number | null | undefined
    >
    tokenLimits: z.ZodEffects<
      z.ZodOptional<
        z.ZodNullable<
          z.ZodObject<
            {
              maxInputTokens: z.ZodOptional<z.ZodNumber>
              maxOutputTokens: z.ZodOptional<z.ZodNumber>
            },
            'strip',
            z.ZodTypeAny,
            {
              maxInputTokens?: number | undefined
              maxOutputTokens?: number | undefined
            },
            {
              maxInputTokens?: number | undefined
              maxOutputTokens?: number | undefined
            }
          >
        >
      >,
      | {
          maxInputTokens?: number | undefined
          maxOutputTokens?: number | undefined
        }
      | undefined,
      | {
          maxInputTokens?: number | undefined
          maxOutputTokens?: number | undefined
        }
      | null
      | undefined
    >
    supportedInputTypes: z.ZodEffects<
      z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, 'many'>>>,
      string[] | undefined,
      string[] | null | undefined
    >
    supportsPromptCache: z.ZodEffects<
      z.ZodOptional<z.ZodNullable<z.ZodBoolean>>,
      boolean | undefined,
      boolean | null | undefined
    >
    additionalModelRequestFieldsSchema: z.ZodEffects<
      z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>,
      Record<string, unknown> | undefined,
      Record<string, unknown> | null | undefined
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    modelId: string
    modelName?: string | undefined
    rateMultiplier?: number | undefined
    tokenLimits?:
      | {
          maxInputTokens?: number | undefined
          maxOutputTokens?: number | undefined
        }
      | undefined
    supportedInputTypes?: string[] | undefined
    supportsPromptCache?: boolean | undefined
    additionalModelRequestFieldsSchema?: Record<string, unknown> | undefined
  },
  {
    modelId: string
    modelName?: string | null | undefined
    rateMultiplier?: number | null | undefined
    tokenLimits?:
      | {
          maxInputTokens?: number | undefined
          maxOutputTokens?: number | undefined
        }
      | null
      | undefined
    supportedInputTypes?: string[] | null | undefined
    supportsPromptCache?: boolean | null | undefined
    additionalModelRequestFieldsSchema?: Record<string, unknown> | null | undefined
  }
>
export type ModelMetadata = z.infer<typeof ModelMetadataSchema>
export declare function toOpenCodeModelId(modelId: string): string
export declare function registerDiscoveredModels(models: readonly ModelMetadata[]): void
export declare function getDiscoveredModel(model: string): ModelMetadata | undefined
/** Separate plugin instances may share the resolver; catalogs are registered additively. */
export declare function clearDiscoveredModels(): void
export declare function getModelEffortContract(model: string):
  | {
      field: 'output_config' | 'reasoning'
      levels: Array<'low' | 'medium' | 'high' | 'xhigh' | 'max'>
    }
  | undefined
