/**
 * Tests for batch-candidates.ts — batch candidate selection and validation.
 */

import { describe, it, expect } from "vitest"
import {
  getCandidatesForBatch,
  validateBatchCandidateIds,
  validateBatchDayNumbers,
  MAX_BATCH_CANDIDATES,
} from "@/lib/workouts/ai/batch-candidates"
import type { CandidateExercise } from "@/lib/workouts/ai/candidate-exercises"
import type { SplitDay } from "@/lib/workouts/ai/workout-split"

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCandidate(id: string, bodyPart: string): CandidateExercise {
  return { id, name: `Ex-${id}`, body_part: bodyPart, equipment: "barbell", target: bodyPart }
}

const CHEST_CANDIDATES = Array.from({ length: 10 }, (_, i) =>
  makeCandidate(`chest-${i}`, "chest"),
)
const BACK_CANDIDATES = Array.from({ length: 10 }, (_, i) =>
  makeCandidate(`back-${i}`, "back"),
)
const UPPER_LEGS_CANDIDATES = Array.from({ length: 10 }, (_, i) =>
  makeCandidate(`upper-legs-${i}`, "upper legs"),
)
const CARDIO_CANDIDATES = Array.from({ length: 5 }, (_, i) =>
  makeCandidate(`cardio-${i}`, "cardio"),
)

const ALL_CANDIDATES: CandidateExercise[] = [
  ...CHEST_CANDIDATES,
  ...BACK_CANDIDATES,
  ...UPPER_LEGS_CANDIDATES,
  ...CARDIO_CANDIDATES,
]

const PUSH_BATCH_DAYS: SplitDay[] = [
  { day_number: 1, name: "Push", focus: ["chest", "shoulders", "upper arms"] },
]

const UPPER_LOWER_BATCH_DAYS: SplitDay[] = [
  { day_number: 1, name: "Upper", focus: ["chest", "back", "shoulders", "upper arms", "lower arms"] },
  { day_number: 2, name: "Lower", focus: ["upper legs", "lower legs", "waist"] },
]

// ── getCandidatesForBatch ──────────────────────────────────────────────────────

describe("getCandidatesForBatch", () => {
  it("returns only exercises relevant to batch focus areas first", () => {
    const result = getCandidatesForBatch(ALL_CANDIDATES, PUSH_BATCH_DAYS)
    // Chest exercises should be included (focus: chest)
    const chestInResult = result.filter((c) => c.body_part === "chest")
    expect(chestInResult.length).toBeGreaterThan(0)
  })

  it("caps total candidates at MAX_BATCH_CANDIDATES", () => {
    // Generate a large candidate set
    const large: CandidateExercise[] = Array.from({ length: 100 }, (_, i) =>
      makeCandidate(`ex-${i}`, i % 2 === 0 ? "chest" : "back"),
    )
    const result = getCandidatesForBatch(large, PUSH_BATCH_DAYS)
    expect(result.length).toBeLessThanOrEqual(MAX_BATCH_CANDIDATES)
  })

  it("never returns more than MAX_BATCH_CANDIDATES candidates", () => {
    const large: CandidateExercise[] = Array.from({ length: 200 }, (_, i) =>
      makeCandidate(`ex-${i}`, "chest"),
    )
    const result = getCandidatesForBatch(large, UPPER_LOWER_BATCH_DAYS)
    expect(result.length).toBeLessThanOrEqual(MAX_BATCH_CANDIDATES)
  })

  it("prioritizes focus body parts over non-focus body parts", () => {
    // Mix focus + non-focus candidates
    const candidates: CandidateExercise[] = [
      makeCandidate("back-1", "back"),     // non-focus for PUSH day
      makeCandidate("chest-1", "chest"),   // focus for PUSH day
      makeCandidate("back-2", "back"),
      makeCandidate("chest-2", "chest"),
    ]
    const result = getCandidatesForBatch(candidates, PUSH_BATCH_DAYS)
    const chestIndices = result.map((c, i) => (c.body_part === "chest" ? i : -1)).filter((i) => i >= 0)
    const backIndices = result.map((c, i) => (c.body_part === "back" ? i : -1)).filter((i) => i >= 0)
    // Chest (focus) should appear before back (non-focus)
    expect(Math.min(...chestIndices)).toBeLessThan(Math.min(...backIndices))
  })

  it("includes focus-relevant candidates for both days in a 2-day batch", () => {
    const result = getCandidatesForBatch(ALL_CANDIDATES, UPPER_LOWER_BATCH_DAYS)
    const chestIn = result.some((c) => c.body_part === "chest")
    const upperLegsIn = result.some((c) => c.body_part === "upper legs")
    expect(chestIn).toBe(true)
    expect(upperLegsIn).toBe(true)
  })

  it("returns some candidates even when no focus match (secondary pass)", () => {
    const candidates: CandidateExercise[] = [
      makeCandidate("neck-1", "neck"),
      makeCandidate("neck-2", "neck"),
    ]
    const result = getCandidatesForBatch(candidates, PUSH_BATCH_DAYS)
    // No neck in focus, but secondary pass fills them in
    expect(result.length).toBeGreaterThan(0)
  })

  it("is deterministic — same inputs always produce same output", () => {
    const a = getCandidatesForBatch(ALL_CANDIDATES, PUSH_BATCH_DAYS)
    const b = getCandidatesForBatch(ALL_CANDIDATES, PUSH_BATCH_DAYS)
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id))
  })

  it("returns all candidates when total < MAX_BATCH_CANDIDATES", () => {
    const small: CandidateExercise[] = [
      makeCandidate("c1", "chest"),
      makeCandidate("c2", "back"),
    ]
    const result = getCandidatesForBatch(small, PUSH_BATCH_DAYS)
    expect(result).toHaveLength(2)
  })
})

// ── validateBatchCandidateIds ─────────────────────────────────────────────────

describe("validateBatchCandidateIds", () => {
  const batchCandidates: CandidateExercise[] = [
    makeCandidate("valid-uuid-1", "chest"),
    makeCandidate("valid-uuid-2", "back"),
  ]

  it("returns empty array when all exercise_ids are valid", () => {
    const outputDays = [
      { day_number: 1, exercises: [{ exercise_id: "valid-uuid-1" }] },
    ]
    const errors = validateBatchCandidateIds(outputDays, batchCandidates)
    expect(errors).toHaveLength(0)
  })

  it("returns error for exercise_id not in batch candidates", () => {
    const outputDays = [
      { day_number: 1, exercises: [{ exercise_id: "unknown-uuid" }] },
    ]
    const errors = validateBatchCandidateIds(outputDays, batchCandidates)
    expect(errors).toHaveLength(1)
    expect(errors[0].exercise_id).toBe("unknown-uuid")
    expect(errors[0].day_number).toBe(1)
  })

  it("reports day_number for each invalid exercise", () => {
    const outputDays = [
      { day_number: 3, exercises: [{ exercise_id: "bad-id" }] },
    ]
    const errors = validateBatchCandidateIds(outputDays, batchCandidates)
    expect(errors[0].day_number).toBe(3)
  })

  it("returns empty array for empty exercises", () => {
    const outputDays = [{ day_number: 1, exercises: [] }]
    const errors = validateBatchCandidateIds(outputDays, batchCandidates)
    expect(errors).toHaveLength(0)
  })

  it("detects invalid IDs across multiple days", () => {
    const outputDays = [
      { day_number: 1, exercises: [{ exercise_id: "valid-uuid-1" }, { exercise_id: "bad-1" }] },
      { day_number: 2, exercises: [{ exercise_id: "bad-2" }] },
    ]
    const errors = validateBatchCandidateIds(outputDays, batchCandidates)
    expect(errors).toHaveLength(2)
  })
})

// ── validateBatchDayNumbers ───────────────────────────────────────────────────

describe("validateBatchDayNumbers", () => {
  it("returns null when day_numbers match exactly", () => {
    const outputDays = [{ day_number: 1 }, { day_number: 2 }]
    expect(validateBatchDayNumbers(outputDays, [1, 2])).toBeNull()
  })

  it("returns error when count differs", () => {
    const outputDays = [{ day_number: 1 }]
    expect(validateBatchDayNumbers(outputDays, [1, 2])).not.toBeNull()
  })

  it("returns error when day_numbers don't match expected", () => {
    const outputDays = [{ day_number: 3 }, { day_number: 4 }]
    expect(validateBatchDayNumbers(outputDays, [1, 2])).not.toBeNull()
  })

  it("handles order-independent comparison", () => {
    const outputDays = [{ day_number: 2 }, { day_number: 1 }]
    expect(validateBatchDayNumbers(outputDays, [1, 2])).toBeNull()
  })

  it("returns null for single-day batch", () => {
    const outputDays = [{ day_number: 5 }]
    expect(validateBatchDayNumbers(outputDays, [5])).toBeNull()
  })

  it("returns error for extra day", () => {
    const outputDays = [{ day_number: 1 }, { day_number: 2 }, { day_number: 3 }]
    expect(validateBatchDayNumbers(outputDays, [1, 2])).not.toBeNull()
  })
})
