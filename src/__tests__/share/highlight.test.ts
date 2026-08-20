import { describe, expect, it } from "vitest"
import { detectHighlights, selectAutoHighlight, type ExerciseHistory } from "@/components/share/highlight"
import type { WorkoutSessionWithExercises } from "@/types/database"
import type { ShareSetState } from "@/components/share/normalize"
import type { WorkoutShareData } from "@/components/share/types"

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeData(overrides: Partial<WorkoutShareData> = {}): WorkoutShareData {
  return {
    workoutName:    "Leg Day",
    date:           new Date("2026-08-19T10:00:00Z"),
    durationSeconds: 2520,  // 42 min
    completedSets:  18,
    totalReps:      144,
    totalVolumeKg:  8450,
    exerciseCount:  5,
    ...overrides,
  }
}

function makeSession(
  overrides: Partial<WorkoutSessionWithExercises> = {},
): WorkoutSessionWithExercises {
  return {
    id:                  "sess-1",
    user_id:             "user-1",
    workout_plan_id:     null,
    workout_plan_day_id: null,
    status:              "completed",
    started_at:          "2026-08-19T10:00:00Z",
    completed_at:        "2026-08-19T10:42:00Z",
    duration_seconds:    2520,
    notes:               null,
    created_at:          "2026-08-19T10:00:00Z",
    updated_at:          "2026-08-19T10:42:00Z",
    exercises:           [],
    ...overrides,
  } as unknown as WorkoutSessionWithExercises
}

function makeExercise(
  id:       string,
  name:     string,
  bodyPart: string,
  sets:     ReturnType<typeof makeSet>[],
) {
  return {
    id,
    workout_session_id:       "sess-1",
    workout_plan_exercise_id: null,
    exercise_id:              id,
    sort_order:               0,
    target_sets:              3,
    target_reps_min:          8,
    target_reps_max:          12,
    target_duration_seconds:  null,
    target_rest_seconds:      60,
    notes:                    null,
    created_at:               "2026-08-19T10:00:00Z",
    updated_at:               "2026-08-19T10:00:00Z",
    exercise: {
      id,
      name,
      body_part:    bodyPart,
      equipment:    "barbell",
      target:       bodyPart,
      muscle_group: null,
    },
    sets,
  }
}

function makeSet(
  id:    string,
  opts:  { kg?: number | null; reps?: number | null; completed?: boolean } = {},
) {
  return {
    id,
    workout_session_exercise_id: "ex-1",
    set_number:  1,
    set_type:    "working" as const,
    weight_kg:   opts.kg     ?? null,
    reps:        opts.reps   ?? null,
    duration_seconds: null,
    rir:         null,
    rpe:         null,
    completed:   opts.completed ?? false,
    completed_at: null,
    notes:       null,
    created_at:  "2026-08-19T10:00:00Z",
    updated_at:  "2026-08-19T10:00:00Z",
  }
}

const emptyStates = new Map<string, ShareSetState>()

// ── No history → session_completed fallback ───────────────────────────────────

describe("detectHighlights — no history", () => {
  it("returns session_completed when there are no exercises", () => {
    const session = makeSession({ exercises: [] })
    const data    = makeData({ exerciseCount: 0, completedSets: 0, durationSeconds: 0 })
    const result  = detectHighlights(session, emptyStates, data)

    expect(result.some((h) => h.type === "session_completed")).toBe(true)
    expect(result[result.length - 1].type).toBe("session_completed")
  })

  it("includes featured_exercise when session has completed sets", () => {
    const sets    = [makeSet("s1", { kg: 80, reps: 10, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bench", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const data   = makeData()
    const result = detectHighlights(session, emptyStates, data)

    const featured = result.find((h) => h.type === "featured_exercise")
    expect(featured).toBeDefined()
    expect(featured!.headline).toContain("BENCH PRESS")
  })

  it("includes sets highlight when 3+ total completed sets", () => {
    const sets = [
      makeSet("s1", { kg: 80, reps: 10, completed: true }),
      makeSet("s2", { kg: 80, reps: 8,  completed: true }),
      makeSet("s3", { kg: 75, reps: 8,  completed: true }),
    ]
    const session = makeSession({
      exercises: [makeExercise("ex-sq", "Sentadilla", "Upper Legs", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const data   = makeData({ durationSeconds: 2520 })
    const result = detectHighlights(session, emptyStates, data)

    const setsHL = result.find((h) => h.type === "sets")
    expect(setsHL).toBeDefined()
    expect(setsHL!.headline).toBe("3 SERIES")
  })

  it("includes duration highlight when session ≥ 10 min", () => {
    const session = makeSession({ exercises: [] })
    const data    = makeData({ durationSeconds: 2520, exerciseCount: 0 })
    const result  = detectHighlights(session, emptyStates, data)

    const durHL = result.find((h) => h.type === "duration")
    expect(durHL).toBeDefined()
    expect(durHL!.headline).toBe("42 MIN")
  })

  it("does NOT include duration highlight for sessions < 10 min", () => {
    const session = makeSession({ exercises: [] })
    const data    = makeData({ durationSeconds: 420 })  // 7 min
    const result  = detectHighlights(session, emptyStates, data)

    expect(result.find((h) => h.type === "duration")).toBeUndefined()
  })

  it("does NOT claim PR or improvement without history", () => {
    const sets = [makeSet("s1", { kg: 200, reps: 1, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-dl", "Deadlift", "Back", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const data   = makeData()
    const result = detectHighlights(session, emptyStates, data)

    expect(result.find((h) => h.type === "personal_record")).toBeUndefined()
    expect(result.find((h) => h.type === "weight_improvement")).toBeUndefined()
    expect(result.find((h) => h.type === "reps_improvement")).toBeUndefined()
  })
})

// ── History but no improvement → featured_exercise ────────────────────────────

describe("detectHighlights — history with no improvement", () => {
  it("does not emit improvement when current weight ≤ previous best", () => {
    const sets = [makeSet("s1", { kg: 80, reps: 10, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bp", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const data    = makeData()
    const history = new Map<string, ExerciseHistory>([
      ["ex-bp", { exerciseId: "ex-bp", prevBestWeightKg: 80, prevBestReps: 10, sessionCount: 3 }],
    ])
    const result = detectHighlights(session, emptyStates, data, history)

    expect(result.find((h) => h.type === "personal_record")).toBeUndefined()
    expect(result.find((h) => h.type === "weight_improvement")).toBeUndefined()
    expect(result.find((h) => h.type === "reps_improvement")).toBeUndefined()
    expect(result.find((h) => h.type === "featured_exercise")).toBeDefined()
  })

  it("does not emit improvement when reps equal previous best", () => {
    const sets = [makeSet("s1", { kg: 80, reps: 10, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bp", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      ["ex-bp", { exerciseId: "ex-bp", prevBestWeightKg: 80, prevBestReps: 10, sessionCount: 5 }],
    ])
    const result = detectHighlights(session, emptyStates, makeData(), history)
    expect(result.find((h) => h.type === "reps_improvement")).toBeUndefined()
  })
})

// ── Weight improvement ────────────────────────────────────────────────────────

describe("detectHighlights — weight improvement", () => {
  it("emits weight_improvement when current > prev (1 session history)", () => {
    const sets = [makeSet("s1", { kg: 85, reps: 8, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bp", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      ["ex-bp", { exerciseId: "ex-bp", prevBestWeightKg: 80, prevBestReps: 8, sessionCount: 1 }],
    ])
    const result = detectHighlights(session, emptyStates, makeData(), history)

    const h = result.find((h) => h.type === "weight_improvement")
    expect(h).toBeDefined()
    expect(h!.headline).toBe("+5 KG")
    expect(h!.subline).toContain("BENCH PRESS")
    // With only 1 session → NOT a PR
    expect(result.find((r) => r.type === "personal_record")).toBeUndefined()
  })

  it("emits personal_record when ≥ 2 prior sessions", () => {
    const sets = [makeSet("s1", { kg: 90, reps: 8, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-sq", "Sentadilla", "Upper Legs", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      ["ex-sq", { exerciseId: "ex-sq", prevBestWeightKg: 80, prevBestReps: 8, sessionCount: 2 }],
    ])
    const result = detectHighlights(session, emptyStates, makeData(), history)

    const pr = result.find((h) => h.type === "personal_record")
    expect(pr).toBeDefined()
    expect(pr!.headline).toBe("+10 KG")
    expect(pr!.label).toBe("NUEVO RÉCORD PERSONAL")
  })

  it("personal_record is ranked above featured_exercise", () => {
    const sets = [makeSet("s1", { kg: 100, reps: 5, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-dl", "Deadlift", "Back", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      ["ex-dl", { exerciseId: "ex-dl", prevBestWeightKg: 90, prevBestReps: 5, sessionCount: 3 }],
    ])
    const result = detectHighlights(session, emptyStates, makeData(), history)
    expect(result[0].type).toBe("personal_record")
  })
})

// ── Reps improvement ──────────────────────────────────────────────────────────

describe("detectHighlights — reps improvement", () => {
  it("emits reps_improvement when current reps > prev best", () => {
    const sets = [makeSet("s1", { kg: 80, reps: 12, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bp", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      ["ex-bp", { exerciseId: "ex-bp", prevBestWeightKg: 80, prevBestReps: 10, sessionCount: 2 }],
    ])
    const result = detectHighlights(session, emptyStates, makeData(), history)

    const h = result.find((h) => h.type === "reps_improvement")
    expect(h).toBeDefined()
    expect(h!.headline).toBe("+2 REPS")
    expect(h!.subline).toContain("BENCH PRESS")
  })

  it("does not emit reps_improvement if weight already produced a PR for same exercise", () => {
    const sets = [makeSet("s1", { kg: 90, reps: 12, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bp", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      // Both weight and reps improved
      ["ex-bp", { exerciseId: "ex-bp", prevBestWeightKg: 80, prevBestReps: 10, sessionCount: 3 }],
    ])
    const result = detectHighlights(session, emptyStates, makeData(), history)

    // Weight improvement → emits PR; should NOT also emit reps_improvement for same exercise
    const pr   = result.filter((h) => h.type === "personal_record")
    const reps = result.filter((h) => h.type === "reps_improvement")
    expect(pr.length).toBe(1)
    expect(reps.length).toBe(0)
  })
})

// ── Bodyweight sessions ───────────────────────────────────────────────────────

describe("detectHighlights — bodyweight (kg = 0)", () => {
  it("works correctly when all sets have kg = 0 (bodyweight)", () => {
    const sets = [
      makeSet("s1", { kg: 0, reps: 20, completed: true }),
      makeSet("s2", { kg: 0, reps: 18, completed: true }),
      makeSet("s3", { kg: 0, reps: 15, completed: true }),
    ]
    const session = makeSession({
      exercises: [makeExercise("ex-pu", "Push Up", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const data    = makeData({ totalVolumeKg: 0 })
    const result  = detectHighlights(session, emptyStates, data)

    // Should still detect featured_exercise and sets (3 completed)
    expect(result.find((h) => h.type === "featured_exercise")).toBeDefined()
    expect(result.find((h) => h.type === "sets")).toBeDefined()
    // Should NOT produce volume-dependent highlights
    expect(result.find((h) => h.type === "personal_record")).toBeUndefined()
  })

  it("does NOT emit weight_improvement for bodyweight exercises (no kg data)", () => {
    const sets = [makeSet("s1", { kg: null, reps: 20, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bw", "Pull Up", "Back", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      ["ex-bw", { exerciseId: "ex-bw", prevBestWeightKg: null, prevBestReps: 15, sessionCount: 3 }],
    ])
    const result = detectHighlights(session, emptyStates, makeData(), history)

    // Reps improved (20 > 15)
    const repsHL = result.find((h) => h.type === "reps_improvement")
    expect(repsHL).toBeDefined()
    expect(repsHL!.headline).toBe("+5 REPS")
    // No weight highlight
    expect(result.find((h) => h.type === "weight_improvement")).toBeUndefined()
    expect(result.find((h) => h.type === "personal_record")).toBeUndefined()
  })
})

// ── setStates override ────────────────────────────────────────────────────────

describe("detectHighlights — setStates override", () => {
  it("uses setStates values when provided", () => {
    const sets = [makeSet("s1", { kg: 50, reps: 5, completed: false })]
    const session = makeSession({
      exercises: [makeExercise("ex-bp", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const setStates = new Map<string, ShareSetState>([
      ["s1", { weight_kg: "100", reps: "12", completed: true }],
    ])
    const history = new Map<string, ExerciseHistory>([
      ["ex-bp", { exerciseId: "ex-bp", prevBestWeightKg: 80, prevBestReps: 10, sessionCount: 2 }],
    ])
    const result = detectHighlights(session, setStates, makeData(), history)

    // Uses 100kg from setStates, not 50kg from DB → PR
    const pr = result.find((h) => h.type === "personal_record")
    expect(pr).toBeDefined()
    expect(pr!.headline).toBe("+20 KG")
  })
})

// ── selectAutoHighlight ───────────────────────────────────────────────────────

describe("selectAutoHighlight", () => {
  it("picks the highest-priority highlight", () => {
    const session = makeSession({ exercises: [] })
    const data    = makeData({ durationSeconds: 2520 })
    const highlights = detectHighlights(session, emptyStates, data)
    const auto    = selectAutoHighlight(highlights)
    // Without exercises or history, best available is duration or session_completed
    expect(["duration", "session_completed"]).toContain(auto.type)
  })

  it("personal_record beats all other types", () => {
    const sets = [makeSet("s1", { kg: 100, reps: 5, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-dl", "Deadlift", "Back", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const history = new Map<string, ExerciseHistory>([
      ["ex-dl", { exerciseId: "ex-dl", prevBestWeightKg: 90, prevBestReps: 5, sessionCount: 5 }],
    ])
    const highlights = detectHighlights(session, emptyStates, makeData(), history)
    const auto       = selectAutoHighlight(highlights)
    expect(auto.type).toBe("personal_record")
  })

  it("returns session_completed when list is empty", () => {
    const auto = selectAutoHighlight([])
    expect(auto.type).toBe("session_completed")
  })
})

// ── Privacy: no PII in highlight output ───────────────────────────────────────

describe("detectHighlights — privacy", () => {
  it("does not include user_id in highlights", () => {
    const session = makeSession({ user_id: "sensitive-user-id-123", exercises: [] })
    const result  = detectHighlights(session, emptyStates, makeData())
    const json    = JSON.stringify(result)
    expect(json).not.toContain("sensitive-user-id-123")
  })

  it("does not include email or full_name in highlights", () => {
    const session = makeSession({ exercises: [] })
    const result  = detectHighlights(session, emptyStates, makeData())
    const json    = JSON.stringify(result)
    expect(json).not.toContain("email")
    expect(json).not.toContain("full_name")
    expect(json).not.toContain("username")
  })
})

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("detectHighlights — edge cases", () => {
  it("handles 1 exercise with 1 set at 1 rep", () => {
    const sets = [makeSet("s1", { kg: 200, reps: 1, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-dl", "Deadlift", "Back", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = detectHighlights(session, emptyStates, makeData({ completedSets: 1 }))

    expect(result.find((h) => h.type === "featured_exercise")).toBeDefined()
    // Only 1 set → sets threshold not met (< 3)
    expect(result.find((h) => h.type === "sets")).toBeUndefined()
  })

  it("handles very long exercise name without crash", () => {
    const name = "Sentadilla con barra en hack squat machine con pausa"
    const sets = [makeSet("s1", { kg: 80, reps: 10, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-long", name, "Upper Legs", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = detectHighlights(session, emptyStates, makeData())
    const featured = result.find((h) => h.type === "featured_exercise")
    expect(featured).toBeDefined()
    expect(featured!.headline).toBe(name.toUpperCase())
  })

  it("handles session with 29-second duration (< 10 min) — no duration highlight", () => {
    const session = makeSession({ exercises: [], duration_seconds: 29 })
    const data    = makeData({ durationSeconds: 29 })
    const result  = detectHighlights(session, emptyStates, data)
    expect(result.find((h) => h.type === "duration")).toBeUndefined()
  })

  it("handles zero reps without crash", () => {
    const sets = [makeSet("s1", { kg: 80, reps: 0, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("ex-bp", "Bench Press", "Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = detectHighlights(session, emptyStates, makeData())
    // Should not crash
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it("all highlights are unique by type", () => {
    const sets = [
      makeSet("s1", { kg: 80, reps: 10, completed: true }),
      makeSet("s2", { kg: 80, reps: 8,  completed: true }),
      makeSet("s3", { kg: 75, reps: 8,  completed: true }),
    ]
    const session = makeSession({
      exercises: [makeExercise("ex-sq", "Sentadilla", "Upper Legs", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = detectHighlights(session, emptyStates, makeData())
    const types  = result.map((h) => h.type)
    const unique = new Set(types)
    expect(types.length).toBe(unique.size)
  })
})
