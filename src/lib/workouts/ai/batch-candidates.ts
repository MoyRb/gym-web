/**
 * Batch Candidate Selection
 *
 * Selects a focused subset of exercises relevant to a specific batch of
 * training days. Keeps token usage in the 20–35 candidate range per batch.
 *
 * Pure function — no DB access, no side effects.
 */

import type { CandidateExercise } from "./candidate-exercises"
import type { SplitDay } from "./workout-split"

/** Maximum candidates sent per AI batch request */
export const MAX_BATCH_CANDIDATES = 35

/**
 * Selects a deterministic, capped set of candidates for a batch.
 *
 * Strategy:
 *   1. Primary pass: exercises whose body_part matches any focus area of the batch days.
 *   2. Secondary pass: remaining exercises, up to the cap.
 *
 * Both passes preserve the ordering of allCandidates (already prioritized by
 * goal and sorted by name within each body_part from selectCandidates()).
 *
 * @param allCandidates - Full candidate set produced by selectCandidates()
 * @param batchDays     - Days in this batch (1–2 days with their focus arrays)
 * @returns Candidate subset, max MAX_BATCH_CANDIDATES entries
 */
export function getCandidatesForBatch(
  allCandidates: CandidateExercise[],
  batchDays: SplitDay[],
): CandidateExercise[] {
  const focusBodyParts = new Set(
    batchDays.flatMap((d) => d.focus.map((f) => f.toLowerCase())),
  )

  const primary: CandidateExercise[] = []
  const secondary: CandidateExercise[] = []

  for (const c of allCandidates) {
    if (focusBodyParts.has(c.body_part.toLowerCase())) {
      primary.push(c)
    } else {
      secondary.push(c)
    }
  }

  const result: CandidateExercise[] = []

  for (const c of primary) {
    if (result.length >= MAX_BATCH_CANDIDATES) break
    result.push(c)
  }

  for (const c of secondary) {
    if (result.length >= MAX_BATCH_CANDIDATES) break
    result.push(c)
  }

  return result
}

/**
 * Validates that all exercise_ids in a batch output belong to the
 * batch-specific candidate set.
 *
 * @returns Array of invalid exercise_ids found (empty = all valid)
 */
export function validateBatchCandidateIds(
  batchDays: Array<{ day_number: number; exercises: Array<{ exercise_id: string }> }>,
  batchCandidates: CandidateExercise[],
): Array<{ exercise_id: string; day_number: number }> {
  const candidateIds = new Set(batchCandidates.map((c) => c.id))
  const errors: Array<{ exercise_id: string; day_number: number }> = []

  for (const day of batchDays) {
    for (const ex of day.exercises) {
      if (!candidateIds.has(ex.exercise_id)) {
        errors.push({ exercise_id: ex.exercise_id, day_number: day.day_number })
      }
    }
  }

  return errors
}

/**
 * Validates that all exercise_ids in a selection output belong to the batch candidates.
 * For use with the exercise selection flow (AI returns exercise_ids per day).
 *
 * @returns Array of invalid { exercise_id, day_number } pairs (empty = all valid)
 */
export function validateSelectionCandidateIds(
  selectionDays: Array<{ day_number: number; exercise_ids: string[] }>,
  batchCandidates: CandidateExercise[],
): Array<{ exercise_id: string; day_number: number }> {
  const candidateIds = new Set(batchCandidates.map((c) => c.id))
  const errors: Array<{ exercise_id: string; day_number: number }> = []

  for (const day of selectionDays) {
    for (const exercise_id of day.exercise_ids) {
      if (!candidateIds.has(exercise_id)) {
        errors.push({ exercise_id, day_number: day.day_number })
      }
    }
  }

  return errors
}

/**
 * Validates that days with broad focus (Full Body, Upper, etc.) have sufficient
 * body_part variety among selected exercises.
 *
 * Rule: a day with ≥4 distinct focus body_parts must not have ALL selected exercises
 * from the same body_part. This catches pathological AI outputs (e.g., 6 chest
 * exercises for a Full Body day) without requiring perfect distribution.
 *
 * Only runs when the day has ≥2 exercises — a 1-exercise day cannot be "varied".
 *
 * @param selectionDays  - AI selection output (exercise_ids per day)
 * @param batchDays      - Split days for this batch (provides focus arrays)
 * @param candidateMap   - Maps exercise_id → { body_part } (from batch candidates)
 * @returns Error string if variety is insufficient, null if valid
 */
export function validateBodyPartVariety(
  selectionDays: Array<{ day_number: number; exercise_ids: string[] }>,
  batchDays: SplitDay[],
  candidateMap: Map<string, { body_part: string }>,
): string | null {
  const splitMap = new Map(batchDays.map((d) => [d.day_number, d]))

  for (const day of selectionDays) {
    const splitDay = splitMap.get(day.day_number)
    // Only validate broad-focus days (Full Body, Upper, Lower, etc.)
    if (!splitDay || splitDay.focus.length < 4) continue
    if (day.exercise_ids.length < 2) continue

    const bodyParts = day.exercise_ids
      .map((id) => candidateMap.get(id)?.body_part.toLowerCase() ?? "")
      .filter((bp) => bp !== "")

    const uniqueBodyParts = new Set(bodyParts)
    if (uniqueBodyParts.size === 1) {
      return (
        `Day ${day.day_number} (${splitDay.name}) has ${day.exercise_ids.length} exercises ` +
        `all from body_part "${[...uniqueBodyParts][0]}" — insufficient variety`
      )
    }
  }

  return null
}

/**
 * Validates that a batch output contains exactly the expected day_numbers.
 *
 * @param outputDays        - Days returned by the AI for this batch
 * @param expectedDayNumbers - Day numbers that should be in this batch
 * @returns Error message if invalid, null if valid
 */
export function validateBatchDayNumbers(
  outputDays: Array<{ day_number: number }>,
  expectedDayNumbers: number[],
): string | null {
  const returned = outputDays.map((d) => d.day_number).sort((a, b) => a - b)
  const expected = [...expectedDayNumbers].sort((a, b) => a - b)

  if (returned.length !== expected.length) {
    return `Expected days [${expected.join(",")}], got [${returned.join(",")}]`
  }

  for (let i = 0; i < expected.length; i++) {
    if (returned[i] !== expected[i]) {
      return `Expected day_numbers [${expected.join(",")}], got [${returned.join(",")}]`
    }
  }

  return null
}
