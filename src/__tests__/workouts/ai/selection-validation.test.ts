/**
 * Tests for the exercise selection validation utilities.
 *
 * Covers validateSelectionCandidateIds and the schema-level validation
 * for the new AIExerciseSelectionOutputSchema.
 */

import { describe, it, expect } from "vitest"
import { validateSelectionCandidateIds, validateBatchDayNumbers, validateBodyPartVariety } from "@/lib/workouts/ai/batch-candidates"
import { AIExerciseSelectionRawOutputSchema, AIExerciseSelectionOutputSchema } from "@/lib/ai/schemas"
import type { CandidateExercise } from "@/lib/workouts/ai/candidate-exercises"
import type { SplitDay } from "@/lib/workouts/ai/workout-split"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const UUID_1 = "00000000-0000-0000-0000-000000000001"
const UUID_2 = "00000000-0000-0000-0000-000000000002"
const UUID_3 = "00000000-0000-0000-0000-000000000003"
const UNKNOWN_UUID = "ffffffff-ffff-ffff-ffff-ffffffffffff"

function makeCandidate(id: string, bodyPart = "chest"): CandidateExercise {
  return { id, name: `Ex-${id}`, body_part: bodyPart, equipment: "barbell", target: bodyPart }
}

const BATCH_CANDIDATES: CandidateExercise[] = [
  makeCandidate(UUID_1),
  makeCandidate(UUID_2, "back"),
  makeCandidate(UUID_3, "upper legs"),
]

// ── validateSelectionCandidateIds ─────────────────────────────────────────────

describe("validateSelectionCandidateIds", () => {
  it("returns empty array when all exercise_ids are valid", () => {
    const days = [
      { day_number: 1, exercise_ids: [UUID_1, UUID_2] },
    ]
    expect(validateSelectionCandidateIds(days, BATCH_CANDIDATES)).toHaveLength(0)
  })

  it("returns error for exercise_id not in batch candidates", () => {
    const days = [
      { day_number: 1, exercise_ids: [UNKNOWN_UUID] },
    ]
    const errors = validateSelectionCandidateIds(days, BATCH_CANDIDATES)
    expect(errors).toHaveLength(1)
    expect(errors[0].exercise_id).toBe(UNKNOWN_UUID)
    expect(errors[0].day_number).toBe(1)
  })

  it("reports correct day_number for each invalid exercise", () => {
    const days = [
      { day_number: 3, exercise_ids: ["bad-id"] },
    ]
    const errors = validateSelectionCandidateIds(days, BATCH_CANDIDATES)
    expect(errors[0].day_number).toBe(3)
  })

  it("returns empty array for empty exercise_ids list", () => {
    const days = [{ day_number: 1, exercise_ids: [] }]
    expect(validateSelectionCandidateIds(days, BATCH_CANDIDATES)).toHaveLength(0)
  })

  it("detects invalid IDs across multiple days", () => {
    const days = [
      { day_number: 1, exercise_ids: [UUID_1, "bad-1"] },
      { day_number: 2, exercise_ids: ["bad-2", UUID_2] },
    ]
    const errors = validateSelectionCandidateIds(days, BATCH_CANDIDATES)
    expect(errors).toHaveLength(2)
    expect(errors.map((e) => e.exercise_id)).toContain("bad-1")
    expect(errors.map((e) => e.exercise_id)).toContain("bad-2")
  })

  it("valid IDs across multiple days pass", () => {
    const days = [
      { day_number: 1, exercise_ids: [UUID_1, UUID_2] },
      { day_number: 2, exercise_ids: [UUID_3] },
    ]
    expect(validateSelectionCandidateIds(days, BATCH_CANDIDATES)).toHaveLength(0)
  })

  it("empty candidates list causes all IDs to fail", () => {
    const days = [{ day_number: 1, exercise_ids: [UUID_1] }]
    const errors = validateSelectionCandidateIds(days, [])
    expect(errors).toHaveLength(1)
  })

  it("is independent from old validateBatchCandidateIds shape", () => {
    // validateSelectionCandidateIds uses exercise_ids array, not exercises[].exercise_id
    const days = [{ day_number: 1, exercise_ids: [UUID_1] }]
    // This should work — the function accepts the new shape
    expect(() => validateSelectionCandidateIds(days, BATCH_CANDIDATES)).not.toThrow()
  })
})

// ── AI selection schemas ───────────────────────────────────────────────────────

describe("AIExerciseSelectionRawOutputSchema", () => {
  it("accepts valid selection output", () => {
    const input = {
      days: [
        { day_number: 1, exercise_ids: [UUID_1, UUID_2] },
      ],
    }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(true)
  })

  it("accepts 2-day batch", () => {
    const input = {
      days: [
        { day_number: 1, exercise_ids: [UUID_1] },
        { day_number: 2, exercise_ids: [UUID_2, UUID_3] },
      ],
    }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(true)
  })

  it("rejects exercise_id that is not a valid UUID", () => {
    const input = {
      days: [{ day_number: 1, exercise_ids: ["not-a-uuid"] }],
    }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(false)
  })

  it("rejects empty days array", () => {
    const input = { days: [] }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(false)
  })

  it("rejects more than 2 days", () => {
    const input = {
      days: [
        { day_number: 1, exercise_ids: [UUID_1] },
        { day_number: 2, exercise_ids: [UUID_2] },
        { day_number: 3, exercise_ids: [UUID_3] },
      ],
    }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(false)
  })

  it("rejects empty exercise_ids array", () => {
    const input = {
      days: [{ day_number: 1, exercise_ids: [] }],
    }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(false)
  })

  it("rejects day_number out of range", () => {
    const input = {
      days: [{ day_number: 8, exercise_ids: [UUID_1] }],
    }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(false)
  })

  it("rejects more than 20 exercise_ids per day", () => {
    const ids = Array.from({ length: 21 }, (_, i) =>
      `00000000-0000-0000-0000-0000000000${String(i + 1).padStart(2, "0")}`,
    )
    const input = { days: [{ day_number: 1, exercise_ids: ids }] }
    expect(AIExerciseSelectionRawOutputSchema.safeParse(input).success).toBe(false)
  })

  it("strips extra unknown fields (Zod default behavior)", () => {
    const input = {
      days: [{ day_number: 1, exercise_ids: [UUID_1], extra_field: "ignored" }],
      unexpected_key: 42,
    }
    const result = AIExerciseSelectionRawOutputSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect("extra_field" in result.data.days[0]).toBe(false)
    }
  })
})

describe("AIExerciseSelectionOutputSchema (strict)", () => {
  it("accepts valid strict output", () => {
    const input = {
      days: [
        { day_number: 1, exercise_ids: [UUID_1, UUID_2] },
        { day_number: 2, exercise_ids: [UUID_3] },
      ],
    }
    expect(AIExerciseSelectionOutputSchema.safeParse(input).success).toBe(true)
  })

  it("rejects non-UUID exercise_id", () => {
    const input = {
      days: [{ day_number: 1, exercise_ids: ["not-a-uuid"] }],
    }
    expect(AIExerciseSelectionOutputSchema.safeParse(input).success).toBe(false)
  })
})

// ── validateBodyPartVariety ───────────────────────────────────────────────────

describe("validateBodyPartVariety", () => {
  // Full Body day has ≥4 focus areas
  const FULL_BODY_DAY: SplitDay = {
    day_number: 1,
    name: "Full Body",
    focus: ["chest", "back", "upper legs", "shoulders", "upper arms", "waist"],
  }
  // Push day has only 3 focus areas (narrow, not checked)
  const PUSH_DAY: SplitDay = {
    day_number: 1,
    name: "Push",
    focus: ["chest", "shoulders", "upper arms"],
  }

  const candidateMap = new Map<string, { body_part: string }>([
    [UUID_1, { body_part: "chest" }],
    [UUID_2, { body_part: "back" }],
    [UUID_3, { body_part: "upper legs" }],
  ])

  it("returns null when exercises have varied body_parts on Full Body day", () => {
    const days = [{ day_number: 1, exercise_ids: [UUID_1, UUID_2, UUID_3] }]
    expect(validateBodyPartVariety(days, [FULL_BODY_DAY], candidateMap)).toBeNull()
  })

  it("returns error when all exercises share the same body_part on Full Body day", () => {
    const monoMap = new Map([
      [UUID_1, { body_part: "chest" }],
      [UUID_2, { body_part: "chest" }],
      [UUID_3, { body_part: "chest" }],
    ])
    const days = [{ day_number: 1, exercise_ids: [UUID_1, UUID_2, UUID_3] }]
    const error = validateBodyPartVariety(days, [FULL_BODY_DAY], monoMap)
    expect(error).not.toBeNull()
    expect(error).toContain("Full Body")
    expect(error).toContain("chest")
  })

  it("does NOT check narrow-focus days (Push = 3 focus areas)", () => {
    // Even if all exercises are chest (valid for a Push day)
    const monoMap = new Map([
      [UUID_1, { body_part: "chest" }],
      [UUID_2, { body_part: "chest" }],
      [UUID_3, { body_part: "chest" }],
    ])
    const days = [{ day_number: 1, exercise_ids: [UUID_1, UUID_2, UUID_3] }]
    expect(validateBodyPartVariety(days, [PUSH_DAY], monoMap)).toBeNull()
  })

  it("skips days with fewer than 2 exercises", () => {
    const monoMap = new Map([[UUID_1, { body_part: "chest" }]])
    const days = [{ day_number: 1, exercise_ids: [UUID_1] }]
    expect(validateBodyPartVariety(days, [FULL_BODY_DAY], monoMap)).toBeNull()
  })

  it("returns null for empty days list", () => {
    expect(validateBodyPartVariety([], [FULL_BODY_DAY], candidateMap)).toBeNull()
  })

  it("checks each day independently in a 2-day batch", () => {
    const FULL_BODY_2: SplitDay = {
      day_number: 2,
      name: "Full Body",
      focus: ["chest", "back", "upper legs", "shoulders", "upper arms", "waist"],
    }
    const monoMap = new Map([
      [UUID_1, { body_part: "chest" }],
      [UUID_2, { body_part: "chest" }],
      [UUID_3, { body_part: "back" }],
    ])
    // Day 1: varied (chest + chest → fails because same)
    // Day 2: varied (back → only 1 exercise, skipped)
    const days = [
      { day_number: 1, exercise_ids: [UUID_1, UUID_2] }, // both chest → fail
      { day_number: 2, exercise_ids: [UUID_3] },          // 1 exercise → skipped
    ]
    const error = validateBodyPartVariety(days, [FULL_BODY_DAY, FULL_BODY_2], monoMap)
    expect(error).not.toBeNull()
    expect(error).toContain("Day 1")
  })

  it("returns null when day_number has no matching split day", () => {
    const days = [{ day_number: 99, exercise_ids: [UUID_1, UUID_2] }]
    expect(validateBodyPartVariety(days, [FULL_BODY_DAY], candidateMap)).toBeNull()
  })
})

// ── validateBatchDayNumbers with selection output ─────────────────────────────

describe("validateBatchDayNumbers — compatible with selection day shape", () => {
  it("selection output passes day number validation when correct", () => {
    const selectionDays = [
      { day_number: 1, exercise_ids: [UUID_1] },
      { day_number: 2, exercise_ids: [UUID_2] },
    ]
    expect(validateBatchDayNumbers(selectionDays, [1, 2])).toBeNull()
  })

  it("selection output fails day number validation when wrong days returned", () => {
    const selectionDays = [
      { day_number: 3, exercise_ids: [UUID_1] },
    ]
    expect(validateBatchDayNumbers(selectionDays, [1])).not.toBeNull()
  })
})
