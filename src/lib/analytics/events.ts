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

  // ── AI quota ───────────────────────────────────────────────────────────────
  AI_QUOTA_BLOCKED: "ai_quota_blocked",

  // ── Manual plan lifecycle ──────────────────────────────────────────────────
  MANUAL_PLAN_STARTED:   "manual_plan_started",
  MANUAL_PLAN_CREATED:   "manual_plan_created",
  MANUAL_PLAN_UPDATED:   "manual_plan_updated",
  MANUAL_PLAN_ACTIVATED: "manual_plan_activated",

  // ── Monetization ──────────────────────────────────────────────────────────
  PRICING_VIEWED:  "pricing_viewed",
  UPGRADE_CLICKED: "upgrade_clicked",

  // ── Account lifecycle ──────────────────────────────────────────────────────
  // Fired server-side before calling auth.admin.deleteUser, while user still exists.
  // After deletion, analytics_events.user_id is set to NULL automatically (SET NULL FK).
  ACCOUNT_DELETION_STARTED: "account_deletion_started",
} as const

export type EventName = typeof EVENTS[keyof typeof EVENTS]
