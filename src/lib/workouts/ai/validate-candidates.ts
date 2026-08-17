/**
 * Candidate ID Validator
 *
 * CRITICAL security check: every exercise_id in the AI output
 * MUST belong to the candidate set that was sent to the provider.
 *
 * If any exercise_id is not in the candidate set, the entire generation
 * is rejected. We do NOT auto-correct, look up, or accept unknown IDs
 * even if they exist in public.exercises.
 */

import type { WorkoutAIOutput } from "@/lib/ai/types"
import type { CandidateExercise } from "./candidate-exercises"

export interface CandidateValidationError {
  exercise_id: string
  day_number: number
}

/**
 * Validates that every exercise_id in the AI output is in the candidate set.
 *
 * @param output - AI-generated workout plan
 * @param candidates - The candidate set that was sent to the provider
 * @returns Array of errors (empty = all IDs valid)
 */
export function validateCandidateExerciseIds(
  output: WorkoutAIOutput,
  candidates: CandidateExercise[],
): CandidateValidationError[] {
  const candidateIds = new Set(candidates.map((c) => c.id))
  const errors: CandidateValidationError[] = []

  for (const day of output.days) {
    for (const exercise of day.exercises) {
      if (!candidateIds.has(exercise.exercise_id)) {
        errors.push({
          exercise_id: exercise.exercise_id,
          day_number: day.day_number,
        })
      }
    }
  }

  return errors
}
