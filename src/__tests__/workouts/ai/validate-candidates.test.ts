/**
 * Tests for candidate exercise ID validation.
 */

import { describe, it, expect } from "vitest"
import { validateCandidateExerciseIds } from "@/lib/workouts/ai/validate-candidates"
import type { WorkoutAIOutput, CandidateExercise } from "@/lib/ai/types"

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCandidate(id: string): CandidateExercise {
  return {
    id,
    name: `Exercise ${id}`,
    body_part: "chest",
    equipment: "barbell",
    target: "pectorals",
  }
}

function makeOutput(exerciseIds: string[]): WorkoutAIOutput {
  return {
    name: "Test Plan",
    summary: "A test plan",
    days: [
      {
        day_number: 1,
        name: "Day 1",
        description: null,
        exercises: exerciseIds.map((id) => ({
          exercise_id: id,
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          duration_seconds: null,
          rest_seconds: 90,
          rir: 2,
          notes: null,
        })),
      },
    ],
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("validateCandidateExerciseIds", () => {
  it("returns empty array when all IDs are in candidate set", () => {
    const candidates = [makeCandidate("uuid-1"), makeCandidate("uuid-2")]
    const output = makeOutput(["uuid-1", "uuid-2"])
    const errors = validateCandidateExerciseIds(output, candidates)
    expect(errors).toHaveLength(0)
  })

  it("returns errors for IDs not in candidate set", () => {
    const candidates = [makeCandidate("uuid-1")]
    const output = makeOutput(["uuid-1", "uuid-unknown"])
    const errors = validateCandidateExerciseIds(output, candidates)
    expect(errors).toHaveLength(1)
    expect(errors[0].exercise_id).toBe("uuid-unknown")
  })

  it("rejects UUID not in candidates even if it looks valid", () => {
    const candidates = [makeCandidate("550e8400-e29b-41d4-a716-446655440000")]
    const output = makeOutput(["550e8400-e29b-41d4-a716-446655440001"]) // different UUID
    const errors = validateCandidateExerciseIds(output, candidates)
    expect(errors).toHaveLength(1)
  })

  it("includes day_number in each error", () => {
    const candidates = [makeCandidate("uuid-1")]
    const output: WorkoutAIOutput = {
      name: "Plan",
      summary: "Summary",
      days: [
        {
          day_number: 2,
          name: "Day 2",
          description: null,
          exercises: [
            {
              exercise_id: "uuid-not-in-candidates",
              sets: 3,
              reps_min: 8,
              reps_max: 12,
              duration_seconds: null,
              rest_seconds: 90,
              rir: null,
              notes: null,
            },
          ],
        },
      ],
    }
    const errors = validateCandidateExerciseIds(output, candidates)
    expect(errors[0].day_number).toBe(2)
  })

  it("returns multiple errors for multiple invalid IDs across days", () => {
    const candidates = [makeCandidate("uuid-valid")]
    const output: WorkoutAIOutput = {
      name: "Plan",
      summary: "Summary",
      days: [
        {
          day_number: 1,
          name: "Day 1",
          description: null,
          exercises: [
            {
              exercise_id: "uuid-invalid-1",
              sets: 3,
              reps_min: 8,
              reps_max: 12,
              duration_seconds: null,
              rest_seconds: 90,
              rir: null,
              notes: null,
            },
          ],
        },
        {
          day_number: 2,
          name: "Day 2",
          description: null,
          exercises: [
            {
              exercise_id: "uuid-invalid-2",
              sets: 3,
              reps_min: 8,
              reps_max: 12,
              duration_seconds: null,
              rest_seconds: 90,
              rir: null,
              notes: null,
            },
          ],
        },
      ],
    }
    const errors = validateCandidateExerciseIds(output, candidates)
    expect(errors).toHaveLength(2)
  })

  it("returns empty array when output has no exercises", () => {
    const candidates = [makeCandidate("uuid-1")]
    const output: WorkoutAIOutput = {
      name: "Plan",
      summary: "Summary",
      days: [],
    }
    const errors = validateCandidateExerciseIds(output, candidates)
    expect(errors).toHaveLength(0)
  })

  it("returns errors for every exercise when candidate set is empty", () => {
    const candidates: CandidateExercise[] = []
    const output = makeOutput(["uuid-1", "uuid-2"])
    const errors = validateCandidateExerciseIds(output, candidates)
    expect(errors).toHaveLength(2)
  })
})
