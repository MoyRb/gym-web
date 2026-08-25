/**
 * Central plan configuration.
 * All quota limits live here — never scattered across the codebase.
 */
export const PLAN_CONFIG = {
  // FREE: 1 complete AI generation per rolling 7-day window
  FREE_AI_WINDOW_DAYS: 7,
  FREE_AI_GENERATIONS: 1,

  // PRO: 20 complete AI generations per rolling 30-day window (fair use)
  PRO_AI_WINDOW_DAYS: 30,
  PRO_AI_GENERATIONS: 20,
} as const
