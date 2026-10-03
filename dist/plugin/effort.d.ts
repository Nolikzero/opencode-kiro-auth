import type { Effort } from './config/schema.js'
/**
 * Effort levels ordered from lowest to highest reasoning depth.
 */
export declare const EFFORT_LEVELS: readonly Effort[]
/**
 * Reference thinking budget for each effort level.
 *
 * Scaled to Kiro's real thinking range (1024–128000 on opus-4.8/opus-5) rather
 * than OpenCode's conventional 32768 cap, so every effort level is reachable
 * from a budget alone. These double as the upper bound of each mapping band in
 * budgetToEffort, and as the variant budgets the plugin advertises, so the two
 * cannot drift apart.
 */
export declare const THINKING_BUDGETS: Readonly<Record<Effort, number>>
/**
 * Check if a model supports the effort parameter.
 */
export declare function supportsEffort(kiroModel: string): boolean
/**
 * Check if a model supports xhigh effort level.
 */
export declare function supportsXHighEffort(kiroModel: string): boolean
/**
 * Resolve effort level for a given model.
 * - Returns undefined if model doesn't support effort
 * - Clamps xhigh to max for models that don't support it
 */
export declare function resolveEffort(kiroModel: string, requested: Effort): Effort | undefined
/**
 * Map OpenCode thinking budget to Kiro effort level.
 *
 * Budget bands are scaled to Kiro's real thinking ceiling (1024–128000 for
 * opus-4.8/opus-5), not OpenCode's conventional 32768 cap, so the full effort
 * enum is reachable. Reference budgets:
 * - low:    16384
 * - medium: 32768
 * - high:   65536
 * - xhigh:  98304
 * - max:    128000
 *
 * Each THINKING_BUDGETS value is the inclusive upper bound of its band, so a
 * variant configured with a reference budget maps back to the same level:
 * - ≤16384  → low
 * - ≤32768  → medium
 * - ≤65536  → high
 * - ≤98304  → xhigh (clamped to max on models without xhigh support)
 * - >98304  → max
 */
export declare function budgetToEffort(budget: number, kiroModel: string): Effort | undefined
/**
 * Get the effective effort level based on config, budget, and model.
 *
 * Priority:
 * 1. Explicit effort config (if set) - always applied regardless of thinking state
 * 2. Budget-to-effort mapping (if auto_effort_mapping enabled and thinking)
 * 3. 'medium' default (if thinking enabled)
 * 4. undefined (if not thinking)
 */
export declare function getEffectiveEffort(
  kiroModel: string,
  thinking: boolean,
  budget: number,
  configEffort?: Effort,
  autoEffortMapping?: boolean
): Effort | undefined
