/**
 * Tests for workout coherence validator.
 */

import { describe, it, expect } from "vitest"
import { validateWorkoutCoherence } from "@/lib/workouts/ai/validate-coherence"
import type { WorkoutAIOutput } from "@/lib/ai/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExercise(id: string, overrides: Partial<WorkoutAIOutput["days"][number]["exercises"][number]> = {}) {
  return {
    exercise_id: id,
    sets: 3,
    reps_min: 8,
    reps_max: 12,
    duration_seconds: null,
    rest_seconds: 90,
    rir: 2,
    notes: null,
    ...overrides,
  }
}

function makeDay(
  dayNumber: number,
  exerciseIds: string[] = ["ex-1"],
  overrides: Partial<WorkoutAIOutput["days"][number]> = {},
): WorkoutAIOutput["days"][number] {
  return {
    day_number: dayNumber,
    name: `Day ${dayNumber}`,
    description: null,
    exercises: exerciseIds.map((id) => makeExercise(id)),
    ...overrides,
  }
}

function makeOutput(days: WorkoutAIOutput["days"]): WorkoutAIOutput {
  return { name: "Test Plan", summary: "Summary", days }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("validateWorkoutCoherence", () => {
  it("passes a valid 3-day plan", () => {
    const output = makeOutput([
      makeDay(1, ["ex-1", "ex-2"]),
      makeDay(2, ["ex-3"]),
      makeDay(3, ["ex-4", "ex-5"]),
    ])
    const errors = validateWorkoutCoherence(output, 3)
    expect(errors).toHaveLength(0)
  })

  it("fails when day count does not match days_per_week", () => {
    const output = makeOutput([makeDay(1), makeDay(2)])
    const errors = validateWorkoutCoherence(output, 3)
    expect(errors.some((e) => e.code === "DAYS_COUNT_MISMATCH")).toBe(true)
  })

  it("fails with duplicate day_number", () => {
    const output = makeOutput([makeDay(1, ["ex-1"]), makeDay(1, ["ex-2"]), makeDay(3, ["ex-3"])])
    const errors = validateWorkoutCoherence(output, 3)
    expect(errors.some((e) => e.code === "DAY_NUMBER_DUPLICATE")).toBe(true)
  })

  it("fails when day_numbers do not start at 1", () => {
    const output = makeOutput([makeDay(2), makeDay(3), makeDay(4)])
    const errors = validateWorkoutCoherence(output, 3)
    expect(errors.some((e) => e.code === "DAY_NUMBER_NON_CONSECUTIVE")).toBe(true)
  })

  it("fails when day_numbers exceed days_per_week", () => {
    const output = makeOutput([makeDay(1), makeDay(2), makeDay(5)])
    const errors = validateWorkoutCoherence(output, 3)
    expect(errors.some((e) => e.code === "DAY_NUMBER_NON_CONSECUTIVE")).toBe(true)
  })

  it("fails with an empty day (no exercises)", () => {
    const output = makeOutput([
      makeDay(1, ["ex-1"]),
      { day_number: 2, name: "Day 2", description: null, exercises: [] },
      makeDay(3, ["ex-3"]),
    ])
    const errors = validateWorkoutCoherence(output, 3)
    expect(errors.some((e) => e.code === "EMPTY_DAY")).toBe(true)
  })

  it("fails when a day has more than 12 exercises", () => {
    const ids = Array.from({ length: 13 }, (_, i) => `ex-${i}`)
    const output = makeOutput([makeDay(1, ids)])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "TOO_MANY_EXERCISES")).toBe(true)
  })

  it("fails with duplicate exercise_id in the same day", () => {
    const output = makeOutput([makeDay(1, ["ex-1", "ex-1"])])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "DUPLICATE_EXERCISE")).toBe(true)
  })

  it("fails with sets < 1", () => {
    const output = makeOutput([makeDay(1, [], { exercises: [makeExercise("ex-1", { sets: 0 })] })])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_SETS")).toBe(true)
  })

  it("fails when reps_min > reps_max", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { reps_min: 15, reps_max: 8 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_REP_RANGE")).toBe(true)
  })

  it("passes when reps_min === reps_max", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { reps_min: 10, reps_max: 10 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_REP_RANGE")).toBe(false)
  })

  it("fails with invalid rest_seconds (negative)", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { rest_seconds: -1 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_REST")).toBe(true)
  })

  it("fails with rest_seconds > 600", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { rest_seconds: 601 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_REST")).toBe(true)
  })

  it("fails with invalid RIR (negative)", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { rir: -1 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_RIR")).toBe(true)
  })

  it("fails with invalid RIR (> 5)", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { rir: 6 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_RIR")).toBe(true)
  })

  it("fails when both reps and duration_seconds are set", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { reps_min: 8, reps_max: 12, duration_seconds: 30 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "REPS_AND_DURATION_CONFLICT")).toBe(true)
  })

  it("passes a timed exercise with reps set to null", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { reps_min: null, reps_max: null, duration_seconds: 45 })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "REPS_AND_DURATION_CONFLICT")).toBe(false)
  })

  it("passes null RIR", () => {
    const output = makeOutput([
      makeDay(1, [], {
        exercises: [makeExercise("ex-1", { rir: null })],
      }),
    ])
    const errors = validateWorkoutCoherence(output, 1)
    expect(errors.some((e) => e.code === "INVALID_RIR")).toBe(false)
  })

  it("validates a 7-day plan correctly", () => {
    const output = makeOutput(
      Array.from({ length: 7 }, (_, i) => makeDay(i + 1, [`ex-${i + 1}`])),
    )
    const errors = validateWorkoutCoherence(output, 7)
    expect(errors).toHaveLength(0)
  })

  describe("structured error fields", () => {
    it("EMPTY_DAY error includes day_number", () => {
      const output = makeOutput([
        makeDay(1, ["ex-1"]),
        { day_number: 2, name: "Day 2", description: null, exercises: [] },
      ])
      const errors = validateWorkoutCoherence(output, 2)
      const err = errors.find((e) => e.code === "EMPTY_DAY")
      expect(err?.day_number).toBe(2)
    })

    it("INVALID_SETS error includes day_number and exercise_index", () => {
      const output = makeOutput([
        makeDay(1, [], { exercises: [makeExercise("ex-1", { sets: 0 })] }),
      ])
      const errors = validateWorkoutCoherence(output, 1)
      const err = errors.find((e) => e.code === "INVALID_SETS")
      expect(err?.day_number).toBe(1)
      expect(err?.exercise_index).toBe(0)
    })

    it("INVALID_REP_RANGE error includes exercise_index", () => {
      const output = makeOutput([
        makeDay(1, [], { exercises: [
          makeExercise("ex-1"),
          makeExercise("ex-2", { reps_min: 15, reps_max: 8 }),
        ]}),
      ])
      const errors = validateWorkoutCoherence(output, 1)
      const err = errors.find((e) => e.code === "INVALID_REP_RANGE")
      expect(err?.exercise_index).toBe(1)
    })

    it("REPS_AND_DURATION_CONFLICT error includes day_number and exercise_index", () => {
      const output = makeOutput([
        makeDay(1, [], {
          exercises: [makeExercise("ex-1", { reps_min: 8, reps_max: 12, duration_seconds: 30 })],
        }),
      ])
      const errors = validateWorkoutCoherence(output, 1)
      const err = errors.find((e) => e.code === "REPS_AND_DURATION_CONFLICT")
      expect(err?.day_number).toBe(1)
      expect(err?.exercise_index).toBe(0)
    })

    it("all error codes are stable CoherenceErrorCode values", () => {
      const VALID_CODES = new Set([
        "DAYS_COUNT_MISMATCH", "DAY_NUMBER_DUPLICATE", "DAY_NUMBER_NON_CONSECUTIVE",
        "EMPTY_DAY", "TOO_MANY_EXERCISES", "DUPLICATE_EXERCISE",
        "INVALID_SETS", "INVALID_REP_RANGE", "INVALID_DURATION",
        "INVALID_REST", "INVALID_RIR", "REPS_AND_DURATION_CONFLICT",
      ])
      // Trigger every possible error in one plan
      const output = makeOutput([
        makeDay(1, [], { exercises: [
          makeExercise("ex-1", { sets: 0, reps_min: 15, reps_max: 8, rest_seconds: -1, rir: 6 }),
          makeExercise("ex-1"), // duplicate id
        ]}),
      ])
      const errors = validateWorkoutCoherence(output, 2) // also wrong day count
      for (const e of errors) {
        expect(VALID_CODES.has(e.code)).toBe(true)
      }
    })
  })
})
