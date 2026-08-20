/**
 * Product analytics event taxonomy — V1.
 * Single source of truth for event names used in server-side tracking.
 * Client-side legacy events remain in src/utils/analytics.ts.
 */

export const EVENTS = {
  // ── Workout lifecycle ──────────────────────────────────────────────────────
  WORKOUT_STARTED:   "workout_started",
  WORKOUT_COMPLETED: "workout_completed",
  WORKOUT_CANCELLED: "workout_cancelled",

  // ── Set tracking ───────────────────────────────────────────────────────────
  SET_COMPLETED: "set_completed",

  // ── Exercise discovery ─────────────────────────────────────────────────────
  EXERCISE_VIEWED:   "exercise_viewed",
  EXERCISE_SEARCHED: "exercise_searched",

  // ── AI generation lifecycle ────────────────────────────────────────────────
  AI_GENERATION_STARTED:   "ai_generation_started",
  AI_GENERATION_COMPLETED: "ai_generation_completed",
  AI_GENERATION_FAILED:    "ai_generation_failed",
} as const

export type EventName = typeof EVENTS[keyof typeof EVENTS]
