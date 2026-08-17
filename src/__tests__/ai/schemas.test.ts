/**
 * Tests for AI output Zod schema validation.
 */

import { describe, it, expect } from "vitest"
import { WorkoutAIOutputSchema, WorkoutAIRawOutputSchema } from "@/lib/ai/schemas"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"

const VALID_EXERCISE = {
  exercise_id: VALID_UUID,
  sets: 3,
  reps_min: 8,
  reps_max: 12,
  duration_seconds: null,
  rest_seconds: 90,
  rir: 2,
  notes: null,
}

const VALID_DAY = {
  day_number: 1,
  name: "Day 1 · Push",
  description: "Upper body push",
  exercises: [VALID_EXERCISE],
}

const VALID_OUTPUT = {
  name: "My AI Plan",
  summary: "A well-structured plan",
  days: [VALID_DAY],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WorkoutAIOutputSchema", () => {
  it("accepts valid output", () => {
    const result = WorkoutAIOutputSchema.safeParse(VALID_OUTPUT)
    expect(result.success).toBe(true)
  })

  it("rejects output missing 'name'", () => {
    const result = WorkoutAIOutputSchema.safeParse({ summary: VALID_OUTPUT.summary, days: VALID_OUTPUT.days })
    expect(result.success).toBe(false)
  })

  it("rejects output missing 'summary'", () => {
    const result = WorkoutAIOutputSchema.safeParse({ name: VALID_OUTPUT.name, days: VALID_OUTPUT.days })
    expect(result.success).toBe(false)
  })

  it("rejects output with empty name", () => {
    const result = WorkoutAIOutputSchema.safeParse({ ...VALID_OUTPUT, name: "" })
    expect(result.success).toBe(false)
  })

  it("rejects output with empty days array", () => {
    const result = WorkoutAIOutputSchema.safeParse({ ...VALID_OUTPUT, days: [] })
    expect(result.success).toBe(false)
  })

  it("rejects output with more than 7 days", () => {
    const days = Array.from({ length: 8 }, (_, i) => ({
      ...VALID_DAY,
      day_number: i + 1,
    }))
    const result = WorkoutAIOutputSchema.safeParse({ ...VALID_OUTPUT, days })
    expect(result.success).toBe(false)
  })

  it("rejects exercise with invalid UUID format", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [{ ...VALID_EXERCISE, exercise_id: "not-a-uuid" }],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects exercise with sets = 0", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [{ ...VALID_EXERCISE, sets: 0 }],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects exercise with sets > 20", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [{ ...VALID_EXERCISE, sets: 21 }],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects exercise with rest_seconds > 600", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [{ ...VALID_EXERCISE, rest_seconds: 601 }],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects exercise with rir > 5", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [{ ...VALID_EXERCISE, rir: 6 }],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("accepts exercise with null nullable fields", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [
            {
              ...VALID_EXERCISE,
              reps_min: null,
              reps_max: null,
              duration_seconds: 30,
              rir: null,
              notes: null,
            },
          ],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(true)
  })

  it("accepts description: null on a day", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [{ ...VALID_DAY, description: null }],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(true)
  })

  it("rejects malformed JSON values (string where int expected)", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [{ ...VALID_EXERCISE, sets: "three" }],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects day with empty exercises array", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [{ ...VALID_DAY, exercises: [] }],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects day missing 'name' key", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          day_number: 1,
          description: null,
          exercises: [VALID_EXERCISE],
          // name intentionally absent
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects day with 'description' absent (strict schema requires null, not omitted)", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          day_number: 1,
          name: "Push",
          exercises: [VALID_EXERCISE],
          // description intentionally absent
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects exercise missing a required key", () => {
    const output = {
      ...VALID_OUTPUT,
      days: [
        {
          ...VALID_DAY,
          exercises: [
            {
              exercise_id: VALID_UUID,
              sets: 3,
              reps_min: 8,
              reps_max: 12,
              rest_seconds: 90,
              // duration_seconds, rir, notes intentionally absent
            },
          ],
        },
      ],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })

  it("rejects day with more than 20 exercises", () => {
    const exercises = Array.from({ length: 21 }, (_, i) => ({
      ...VALID_EXERCISE,
      exercise_id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
    }))
    const output = {
      ...VALID_OUTPUT,
      days: [{ ...VALID_DAY, exercises }],
    }
    const result = WorkoutAIOutputSchema.safeParse(output)
    expect(result.success).toBe(false)
  })
})

// ── WorkoutAIRawOutputSchema ───────────────────────────────────────────────────

describe("WorkoutAIRawOutputSchema", () => {
  const RAW_EXERCISE_REQUIRED = {
    exercise_id: VALID_UUID,
    sets: 3,
    rest_seconds: 90,
  }

  const RAW_DAY_REQUIRED = {
    day_number: 1,
    name: "Push",
    exercises: [RAW_EXERCISE_REQUIRED],
  }

  it("accepts output where day.description is absent", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan",
      summary: "Summary",
      days: [{ day_number: 1, name: "Push", exercises: [RAW_EXERCISE_REQUIRED] }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts output where exercise.duration_seconds is absent", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan",
      summary: "Summary",
      days: [{ ...RAW_DAY_REQUIRED, description: null }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts output where exercise.reps_min and reps_max are absent", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan",
      summary: "Summary",
      days: [{ day_number: 1, name: "Push", exercises: [{ exercise_id: VALID_UUID, sets: 3, rest_seconds: 90 }] }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts output where exercise.rir is absent", () => {
    const ex = { exercise_id: VALID_UUID, sets: 3, rest_seconds: 90 }
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan", summary: "Summary",
      days: [{ day_number: 1, name: "Push", exercises: [ex] }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts output where exercise.notes is absent", () => {
    const ex = { exercise_id: VALID_UUID, sets: 3, rest_seconds: 90 }
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan", summary: "Summary",
      days: [{ day_number: 1, name: "Push", exercises: [ex] }],
    })
    expect(result.success).toBe(true)
  })

  it("still rejects output missing top-level 'name'", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      summary: "Summary",
      days: [{ ...RAW_DAY_REQUIRED }],
    })
    expect(result.success).toBe(false)
  })

  it("still rejects output missing day.name", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan", summary: "Summary",
      days: [{ day_number: 1, exercises: [RAW_EXERCISE_REQUIRED] }],
    })
    expect(result.success).toBe(false)
  })

  it("still rejects exercise missing exercise_id", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan", summary: "Summary",
      days: [{ day_number: 1, name: "Push", exercises: [{ sets: 3, rest_seconds: 90 }] }],
    })
    expect(result.success).toBe(false)
  })

  it("still rejects exercise missing sets", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan", summary: "Summary",
      days: [{ day_number: 1, name: "Push", exercises: [{ exercise_id: VALID_UUID, rest_seconds: 90 }] }],
    })
    expect(result.success).toBe(false)
  })

  it("still rejects exercise missing rest_seconds", () => {
    const result = WorkoutAIRawOutputSchema.safeParse({
      name: "Plan", summary: "Summary",
      days: [{ day_number: 1, name: "Push", exercises: [{ exercise_id: VALID_UUID, sets: 3 }] }],
    })
    expect(result.success).toBe(false)
  })
})
