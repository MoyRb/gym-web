/**
 * Coherence Validator
 *
 * Deterministic structural validation of AI-generated workout plans.
 * Applied after Zod schema validation and candidate ID validation.
 * Rejects results that are structurally invalid but pass the JSON schema.
 */

import type { WorkoutAIOutput } from "@/lib/ai/types"

export type CoherenceErrorCode =
  | "DAYS_COUNT_MISMATCH"
  | "DAY_NUMBER_DUPLICATE"
  | "DAY_NUMBER_NON_CONSECUTIVE"
  | "EMPTY_DAY"
  | "TOO_MANY_EXERCISES"
  | "DUPLICATE_EXERCISE"
  | "INVALID_SETS"
  | "INVALID_REP_RANGE"
  | "INVALID_DURATION"
  | "INVALID_REST"
  | "INVALID_RIR"
  | "REPS_AND_DURATION_CONFLICT"

export interface CoherenceError {
  code: CoherenceErrorCode
  message: string
  day_number?: number
  exercise_index?: number
}

/**
 * Validates structural coherence of an AI-generated workout plan.
 *
 * @param output - Zod-validated AI output
 * @param daysPerWeek - Expected number of days from user profile
 * @returns Array of errors (empty = coherent)
 */
export function validateWorkoutCoherence(
  output: WorkoutAIOutput,
  daysPerWeek: number,
): CoherenceError[] {
  const errors: CoherenceError[] = []

  // Exact day count
  if (output.days.length !== daysPerWeek) {
    errors.push({
      code: "DAYS_COUNT_MISMATCH",
      message: `Expected ${daysPerWeek} days, got ${output.days.length}`,
    })
  }

  // day_number uniqueness
  const dayNumbers = output.days.map((d) => d.day_number)
  if (new Set(dayNumbers).size !== dayNumbers.length) {
    errors.push({ code: "DAY_NUMBER_DUPLICATE", message: "Duplicate day_number found" })
  }

  // day_number range: must be 1..daysPerWeek
  const sorted = [...dayNumbers].sort((a, b) => a - b)
  if (
    sorted.length > 0 &&
    (sorted[0] !== 1 || sorted[sorted.length - 1] !== daysPerWeek)
  ) {
    errors.push({
      code: "DAY_NUMBER_NON_CONSECUTIVE",
      message: `day_number values must be 1..${daysPerWeek}, got [${sorted.join(", ")}]`,
    })
  }

  for (const day of output.days) {
    // At least one exercise
    if (day.exercises.length === 0) {
      errors.push({
        code: "EMPTY_DAY",
        message: `Day ${day.day_number} has no exercises`,
        day_number: day.day_number,
      })
    }

    // Upper limit on exercises per day
    if (day.exercises.length > 12) {
      errors.push({
        code: "TOO_MANY_EXERCISES",
        message: `Day ${day.day_number} has ${day.exercises.length} exercises (max 12)`,
        day_number: day.day_number,
      })
    }

    // No duplicate exercise_id within the same day
    const ids = day.exercises.map((e) => e.exercise_id)
    if (new Set(ids).size !== ids.length) {
      errors.push({
        code: "DUPLICATE_EXERCISE",
        message: `Day ${day.day_number} has duplicate exercise_ids`,
        day_number: day.day_number,
      })
    }

    day.exercises.forEach((ex, exIdx) => {
      // Positive sets
      if (ex.sets < 1) {
        errors.push({
          code: "INVALID_SETS",
          message: `Day ${day.day_number} ex[${exIdx}]: sets must be >= 1 (got ${ex.sets})`,
          day_number: day.day_number,
          exercise_index: exIdx,
        })
      }

      // reps range coherence
      if (ex.reps_min !== null && ex.reps_max !== null && ex.reps_min > ex.reps_max) {
        errors.push({
          code: "INVALID_REP_RANGE",
          message: `Day ${day.day_number} ex[${exIdx}]: reps_min (${ex.reps_min}) > reps_max (${ex.reps_max})`,
          day_number: day.day_number,
          exercise_index: exIdx,
        })
      }

      // duration coherence
      if (ex.duration_seconds !== null && ex.duration_seconds < 1) {
        errors.push({
          code: "INVALID_DURATION",
          message: `Day ${day.day_number} ex[${exIdx}]: duration_seconds must be >= 1`,
          day_number: day.day_number,
          exercise_index: exIdx,
        })
      }

      // rest reasonable range
      if (ex.rest_seconds < 0 || ex.rest_seconds > 600) {
        errors.push({
          code: "INVALID_REST",
          message: `Day ${day.day_number} ex[${exIdx}]: rest_seconds ${ex.rest_seconds} out of range [0, 600]`,
          day_number: day.day_number,
          exercise_index: exIdx,
        })
      }

      // RIR valid range (Zod already checks 0-5 but coherence adds belt-and-suspenders)
      if (ex.rir !== null && (ex.rir < 0 || ex.rir > 5)) {
        errors.push({
          code: "INVALID_RIR",
          message: `Day ${day.day_number} ex[${exIdx}]: rir must be in [0, 5] (got ${ex.rir})`,
          day_number: day.day_number,
          exercise_index: exIdx,
        })
      }

      // Incoherent mix: both reps AND duration set
      if ((ex.reps_min !== null || ex.reps_max !== null) && ex.duration_seconds !== null) {
        errors.push({
          code: "REPS_AND_DURATION_CONFLICT",
          message: `Day ${day.day_number} ex[${exIdx}]: exercise has both reps and duration_seconds — use one or the other`,
          day_number: day.day_number,
          exercise_index: exIdx,
        })
      }
    })
  }

  return errors
}
