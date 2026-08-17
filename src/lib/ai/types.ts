/**
 * AI Provider abstraction types.
 *
 * No dependency on any specific provider implementation.
 * The rest of the application depends only on these interfaces — never on Groq directly.
 *
 * server-only: never import in client components.
 */

/**
 * Minimal exercise metadata sent to the AI.
 * Intentionally omits muscle_group and secondary_muscles to keep token usage low.
 * Backend validation only needs id — full metadata stays in the DB.
 */
export interface CandidateExercise {
  id: string
  name: string
  body_part: string
  equipment: string
  target: string
}

/** Compact history context — bounded to avoid large token usage. */
export interface HistorySummary {
  recent_sessions_count: number
  recent_exercise_ids: string[]
}

/**
 * Profile fields sent to the AI.
 * NO email, username, user_id, auth tokens, or administrative data.
 * Only fitness-relevant attributes needed for plan generation.
 */
export interface WorkoutAIProfile {
  age: number | null
  sex: string | null
  weight_kg: number | null
  height_cm: number | null
  experience: string
  goal: string
  days_per_week: number
}

export interface WorkoutAIInput {
  profile: WorkoutAIProfile
  candidates: CandidateExercise[]
  history_summary: HistorySummary | null
}

export interface AIExercise {
  exercise_id: string
  sets: number
  reps_min: number | null
  reps_max: number | null
  duration_seconds: number | null
  rest_seconds: number
  rir: number | null
  notes: string | null
}

export interface AIDay {
  day_number: number
  name: string
  description: string | null
  exercises: AIExercise[]
}

export interface WorkoutAIOutput {
  name: string
  summary: string
  days: AIDay[]
}

/**
 * Provider interface.
 * All provider implementations must satisfy this contract.
 * Workout Engine depends only on this interface.
 */
export interface WorkoutAIProvider {
  generateWorkout(input: WorkoutAIInput): Promise<WorkoutAIOutput>
}

// ── Batch Generation Types ─────────────────────────────────────────────────────

/**
 * Specification for a single day within a batch.
 * Pre-assigned by the backend — the AI must output exactly these day_numbers.
 */
export interface BatchDaySpec {
  day_number: number
  name: string
}

/**
 * Input for a single batch (1–2 days).
 * Candidates are a focused subset relevant to this batch's muscle groups.
 */
export interface WorkoutBatchAIInput {
  profile: WorkoutAIProfile
  batch_days: BatchDaySpec[]
  candidates: CandidateExercise[]
  history_summary: HistorySummary | null
}

/**
 * A single day in a batch output.
 * No name/description — those are pre-assigned by the backend from the split.
 */
export interface BatchAIDay {
  day_number: number
  exercises: AIExercise[]
}

/**
 * Output from a single batch call.
 * Contains only the days requested — no plan name or summary.
 */
export interface WorkoutBatchAIOutput {
  days: BatchAIDay[]
}

/** Rate limit metadata returned from the provider on each batch call. */
export interface RateLimitInfo {
  remainingTokens: number | null
  retryAfterSeconds: number | null
}

/** Wrapper returned by generateBatch() — output + rate limit info. */
export interface BatchGenerationResult {
  output: WorkoutBatchAIOutput
  rateLimitInfo: RateLimitInfo
}

// ── Exercise Selection Types ────────────────────────────────────────────────────

/** Compact selection profile — only goal and experience. No PII sent to AI. */
export interface SelectionProfile {
  goal: string
  experience: string
}

/** A single day in an exercise selection output — only IDs, no prescription data. */
export interface ExerciseSelectionDay {
  day_number: number
  exercise_ids: string[]
}

/** Output from AI exercise selection — just IDs, no sets/reps/notes. */
export interface ExerciseSelectionOutput {
  days: ExerciseSelectionDay[]
}

/** Batch input for AI exercise selection — minimal, no PII. */
export interface ExerciseSelectionBatchInput {
  profile: SelectionProfile
  batch_days: BatchDaySpec[]
  candidates: CandidateExercise[]
  history_summary: HistorySummary | null
  min_exercises_per_day: number
  max_exercises_per_day: number
}

/** Result from generateBatchSelection — exercise IDs + rate limit info. */
export interface SelectionBatchResult {
  output: ExerciseSelectionOutput
  rateLimitInfo: RateLimitInfo
}

export type AIProviderName = "groq"

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "config"
      | "timeout"
      | "rate_limit"
      | "auth"
      | "server"
      | "validation"       // generic: empty content or other pre-parse issue
      | "json_parse"       // JSON.parse failed on provider content
      | "raw_validation"   // provider output failed raw/tolerant Zod schema
      | "strict_validation" // normalized output failed strict canonical schema
      | "disabled"
      | "request_too_large"
      | "schema",
    /** Seconds to wait before retrying — populated on rate_limit errors */
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message)
    this.name = "AIProviderError"
  }
}
