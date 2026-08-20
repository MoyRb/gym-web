/**
 * Data model for the workout share card.
 * All fields come from the session; no PII included.
 */
export interface WorkoutShareData {
  /** Derived workout name (e.g. "Push Day", "Leg Day", "Entrenamiento") */
  workoutName: string
  /** Session start date */
  date: Date
  /** Total session duration in seconds */
  durationSeconds: number
  /** Number of completed sets */
  completedSets: number
  /** Total reps across all completed sets */
  totalReps: number
  /** Total volume: Σ(weight_kg × reps) for completed sets with weight > 0 */
  totalVolumeKg: number
  /** Number of exercises in the session */
  exerciseCount: number
  /** Training goal from the plan, if available */
  goal?: string
}

/** Card export dimensions in CSS pixels. Export at pixelRatio:2 → 1080×1920. */
export const CARD_DIMS = { w: 540, h: 960 } as const

// ── Preset ────────────────────────────────────────────────────────────────────

/**
 * Visual preset — controls card layout and default metric visibility.
 * - "achievement" (default, recommended): highlight-focused hero card
 * - "minimal": clean, minimal, low density, privacy-first
 * - "full": data-dense, all selected metrics shown
 */
export type SharePreset = "achievement" | "minimal" | "full"

// ── Highlight ─────────────────────────────────────────────────────────────────

/**
 * The type of session highlight, ordered by priority (best first).
 * Only history-based types (personal_record, weight_improvement, reps_improvement)
 * are emitted when historical data is available and the improvement is verified.
 */
export type ShareHighlightType =
  | "personal_record"
  | "weight_improvement"
  | "reps_improvement"
  | "featured_exercise"
  | "sets"
  | "duration"
  | "session_completed"

/** A resolved highlight ready to display on the Achievement card. */
export interface ShareHighlight {
  type:     ShareHighlightType
  /** Small label above the headline. e.g. "LOGRO DEL DÍA" */
  label:    string
  /** Main hero text. e.g. "+2 REPS" or "LEG DAY" */
  headline: string
  /** Context line below headline. e.g. "SENTADILLA CON BARRA" */
  subline?: string
}

// ── Metric visibility ─────────────────────────────────────────────────────────

/**
 * Controls which metrics appear on the share card.
 * volume is opt-in (never true by default) — users explicitly choose to reveal weight data.
 */
export interface ShareMetricVisibility {
  workoutName:   boolean
  duration:      boolean
  sets:          boolean
  reps:          boolean
  exerciseCount: boolean
  date:          boolean
  /** Must be explicitly toggled ON by the user. Never shown by default. */
  volume:        boolean
}

// ── Card options ──────────────────────────────────────────────────────────────

/** Combined options controlling how the share card renders. Separate from raw session data. */
export interface ShareCardOptions {
  preset:        SharePreset
  highlight:     ShareHighlight
  highlightMode: "auto" | "manual"
  visibility:    ShareMetricVisibility
  /** Optional user photo data-URL used as background (any preset). */
  userPhoto?:    string
}
