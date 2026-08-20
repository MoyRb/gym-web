import { describe, expect, it } from "vitest"
import { normalizeWorkoutShareData } from "@/components/share/normalize"
import type { WorkoutSessionWithExercises } from "@/types/database"

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(
  overrides: Partial<WorkoutSessionWithExercises> = {},
): WorkoutSessionWithExercises {
  return {
    id:                    "sess-1",
    user_id:               "user-1",
    workout_plan_id:       null,
    workout_plan_day_id:   null,
    status:                "completed",
    started_at:            "2026-08-19T10:00:00Z",
    completed_at:          "2026-08-19T10:42:00Z",
    duration_seconds:      2520,  // 42 min
    notes:                 null,
    created_at:            "2026-08-19T10:00:00Z",
    updated_at:            "2026-08-19T10:42:00Z",
    exercises: [],
    ...overrides,
  } as unknown as WorkoutSessionWithExercises
}

function makeExercise(bodyPart: string, sets: ReturnType<typeof makeSet>[]) {
  return {
    id:                       "ex-1",
    workout_session_id:       "sess-1",
    workout_plan_exercise_id: null,
    exercise_id:              "exr-1",
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
      id:           "exr-1",
      name:         "Bench Press",
      body_part:    bodyPart,
      equipment:    "barbell",
      target:       "chest",
      muscle_group: null,
    },
    sets,
  }
}

function makeSet(id: string, opts: { kg?: number; reps?: number; completed?: boolean } = {}) {
  return {
    id,
    workout_session_exercise_id: "ex-1",
    set_number:  1,
    set_type:    "normal",
    weight_kg:   opts.kg ?? null,
    reps:        opts.reps ?? null,
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("normalizeWorkoutShareData", () => {
  it("computes volume and reps from completed sets", () => {
    const sets = [
      makeSet("s1", { kg: 80, reps: 10, completed: true }),
      makeSet("s2", { kg: 80, reps:  8, completed: true }),
      makeSet("s3", { kg: 80, reps:  8, completed: false }),
    ]
    const session = makeSession({
      exercises: [makeExercise("Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = normalizeWorkoutShareData(session, new Map())

    expect(result.completedSets).toBe(2)
    expect(result.totalReps).toBe(18)           // 10 + 8
    expect(result.totalVolumeKg).toBe(80 * 18)  // 1440
  })

  it("prefers live setStates over DB values", () => {
    const sets = [makeSet("s1", { kg: 50, reps: 5, completed: false })]
    const session = makeSession({
      exercises: [makeExercise("Back", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const stateMap = new Map([
      ["s1", { weight_kg: "100", reps: "12", completed: true }],
    ])
    const result = normalizeWorkoutShareData(session, stateMap)

    expect(result.completedSets).toBe(1)
    expect(result.totalReps).toBe(12)
    expect(result.totalVolumeKg).toBe(100 * 12)  // 1200
  })

  it("handles bodyweight (kg = 0) — volume is 0, not negative", () => {
    const sets = [makeSet("s1", { kg: 0, reps: 15, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("Waist", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = normalizeWorkoutShareData(session, new Map())

    expect(result.totalVolumeKg).toBe(0)
    expect(result.totalReps).toBe(15)
  })

  it("handles 1 set with 1 rep", () => {
    const sets = [makeSet("s1", { kg: 200, reps: 1, completed: true })]
    const session = makeSession({
      exercises: [makeExercise("Chest", sets)] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = normalizeWorkoutShareData(session, new Map())
    expect(result.completedSets).toBe(1)
    expect(result.totalVolumeKg).toBe(200)
  })

  it("handles empty session (no exercises)", () => {
    const session = makeSession({ exercises: [] })
    const result = normalizeWorkoutShareData(session, new Map())

    expect(result.workoutName).toBe("Entrenamiento")
    expect(result.completedSets).toBe(0)
    expect(result.totalReps).toBe(0)
    expect(result.totalVolumeKg).toBe(0)
    expect(result.exerciseCount).toBe(0)
  })

  it("picks up duration from session", () => {
    const session = makeSession({ duration_seconds: 3661 })
    const result = normalizeWorkoutShareData(session, new Map())
    expect(result.durationSeconds).toBe(3661)
  })

  it("uses 0 when duration_seconds is null", () => {
    const session = makeSession({ duration_seconds: null })
    const result = normalizeWorkoutShareData(session, new Map())
    expect(result.durationSeconds).toBe(0)
  })
})

// ── Workout name — primary source: workout_plan_days.name ─────────────────────

describe("normalizeWorkoutShareData — workoutDayName (primary source)", () => {
  function name(dayName: string | null | undefined, bodyParts: string[]) {
    const exercises = bodyParts.map((bp) => makeExercise(bp, []))
    const session = makeSession({
      exercises: exercises as unknown as WorkoutSessionWithExercises["exercises"],
    })
    return normalizeWorkoutShareData(session, new Map(), dayName).workoutName
  }

  // ── Regression: the exact bug that was reported ──────────────────────────
  it("Full Body day + first exercise body_part=chest → Full Body (not Pecho)", () => {
    expect(name("Full Body", ["chest"])).toBe("Full Body")
  })

  it("Full Body day + featured exercise barbell deadlift body_part=back → Full Body", () => {
    expect(name("Full Body", ["chest", "back", "upper legs"])).toBe("Full Body")
  })

  // ── Day name takes priority over ALL body part inference ─────────────────
  it("Push Day + shoulders body_part → Push Day (not inferred)", () => {
    expect(name("Push Day", ["shoulders"])).toBe("Push Day")
  })

  it("Legs day + featured exercise barbell deadlift → Legs (not Leg Day)", () => {
    expect(name("Legs", ["upper legs"])).toBe("Legs")
  })

  it("Upper day name → Upper (not changed)", () => {
    expect(name("Upper", ["chest", "shoulders"])).toBe("Upper")
  })

  it("Día de pierna → Día de pierna (not translated)", () => {
    expect(name("Día de pierna", ["upper legs"])).toBe("Día de pierna")
  })

  it("Long name is passed through intact", () => {
    const long = "Full Body — Fuerza y acondicionamiento"
    expect(name(long, ["chest", "back", "upper legs"])).toBe(long)
  })

  it("dayName trims surrounding whitespace", () => {
    expect(name("  Full Body  ", ["chest"])).toBe("Full Body")
  })

  // ── All presets use the same normalized workoutName ───────────────────────
  it("workoutName is resolved before card rendering (single source)", () => {
    const session = makeSession({
      exercises: [makeExercise("chest", [])] as unknown as WorkoutSessionWithExercises["exercises"],
    })
    const result = normalizeWorkoutShareData(session, new Map(), "Full Body")
    // All card presets (Achievement, Minimal, Full) consume this same field
    expect(result.workoutName).toBe("Full Body")
  })

  // ── Fallback chain when dayName is absent ─────────────────────────────────
  it("null dayName → falls back to body-part derivation", () => {
    expect(name(null, ["chest", "shoulders"])).toBe("Push Day")
  })

  it("undefined dayName → falls back to body-part derivation", () => {
    expect(name(undefined, ["back", "biceps"])).toBe("Pull Day")
  })

  it("empty string dayName → falls back to body-part derivation", () => {
    expect(name("", ["upper legs"])).toBe("Leg Day")
  })

  it("missing plan day (null dayName, no exercises) → Entrenamiento", () => {
    expect(name(null, [])).toBe("Entrenamiento")
  })

  it("missing plan day (null dayName, unknown body part) → title-cased fallback", () => {
    expect(name(null, ["neck"])).toBe("Neck")
  })
})

// ── Workout name derivation (legacy body-part fallback) ───────────────────────

describe("normalizeWorkoutShareData — workout name (body-part fallback)", () => {
  function name(bodyParts: string[]) {
    const exercises = bodyParts.map((bp) => makeExercise(bp, []))
    const session = makeSession({
      exercises: exercises as unknown as WorkoutSessionWithExercises["exercises"],
    })
    return normalizeWorkoutShareData(session, new Map()).workoutName
  }

  it("chest + shoulders → Push Day", () => {
    expect(name(["Chest", "Shoulders"])).toBe("Push Day")
  })

  it("chest alone → Pecho", () => {
    expect(name(["Chest"])).toBe("Pecho")
  })

  it("back + biceps → Pull Day", () => {
    expect(name(["Back", "Biceps"])).toBe("Pull Day")
  })

  it("back alone → Espalda", () => {
    expect(name(["Back"])).toBe("Espalda")
  })

  it("legs → Leg Day", () => {
    expect(name(["Upper Legs"])).toBe("Leg Day")
  })

  it("waist / core → Core", () => {
    expect(name(["Waist"])).toBe("Core")
  })

  it("cardio → Cardio", () => {
    expect(name(["Cardio"])).toBe("Cardio")
  })

  it("empty body parts → Entrenamiento", () => {
    expect(name([])).toBe("Entrenamiento")
  })

  it("unknown body part → title-cased first body part", () => {
    expect(name(["neck"])).toBe("Neck")
  })

  it("does not expose PII from session", () => {
    const session = makeSession({ exercises: [] })
    const result = normalizeWorkoutShareData(session, new Map())
    // No user info in the share data model
    expect(result).not.toHaveProperty("user_id")
    expect(result).not.toHaveProperty("email")
    expect(result).not.toHaveProperty("full_name")
  })
})
