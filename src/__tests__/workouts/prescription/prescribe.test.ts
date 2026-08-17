/**
 * Tests for the Deterministic Exercise Prescription Engine.
 *
 * Verifies:
 * - All goal × experience combinations produce valid, non-null required fields.
 * - Cardio exercises get duration-based prescription (no reps).
 * - Non-cardio exercises get rep-based prescription (no duration_seconds).
 * - Unknown goal/experience fall back to safe defaults.
 * - getExerciseCountBounds(daysPerWeek, experience) returns correct matrix.
 */

import { describe, it, expect } from "vitest"
import {
  prescribeExercise,
  isDurationBased,
  getExerciseCountBounds,
} from "@/lib/workouts/prescription/prescribe"

const GOALS = [
  "ganar_masa_muscular",
  "bajar_grasa",
  "mejorar_resistencia",
  "mejorar_condicion_general",
] as const

const EXPERIENCES = ["principiante", "intermedio", "avanzado"] as const

const REP_EXERCISE = { body_part: "chest" }
const CARDIO_EXERCISE = { body_part: "cardio" }
const EXERCISE_ID = "00000000-0000-0000-0000-000000000001"

// ── isDurationBased ────────────────────────────────────────────────────────────

describe("isDurationBased", () => {
  it("returns true for cardio body_part", () => {
    expect(isDurationBased({ body_part: "cardio" })).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(isDurationBased({ body_part: "Cardio" })).toBe(true)
    expect(isDurationBased({ body_part: "CARDIO" })).toBe(true)
  })

  it("returns false for non-cardio body parts", () => {
    const nonCardio = ["chest", "back", "upper legs", "shoulders", "upper arms", "waist", "neck"]
    for (const bp of nonCardio) {
      expect(isDurationBased({ body_part: bp })).toBe(false)
    }
  })
})

// ── prescribeExercise — rep-based ─────────────────────────────────────────────

describe("prescribeExercise — rep-based exercises", () => {
  for (const goal of GOALS) {
    for (const experience of EXPERIENCES) {
      it(`${goal} × ${experience}: required fields are never null`, () => {
        const result = prescribeExercise(EXERCISE_ID, REP_EXERCISE, goal, experience)

        expect(result.exercise_id).toBe(EXERCISE_ID)
        expect(result.sets).toBeGreaterThanOrEqual(1)
        expect(result.sets).toBeTypeOf("number")
        expect(result.reps_min).not.toBeNull()
        expect(result.reps_max).not.toBeNull()
        expect(result.reps_min).toBeTypeOf("number")
        expect(result.reps_max).toBeTypeOf("number")
        expect(result.duration_seconds).toBeNull()
        expect(result.rest_seconds).toBeGreaterThanOrEqual(0)
        expect(result.rest_seconds).toBeTypeOf("number")
        expect(result.notes).toBeNull()
      })

      it(`${goal} × ${experience}: reps_min <= reps_max`, () => {
        const result = prescribeExercise(EXERCISE_ID, REP_EXERCISE, goal, experience)
        expect(result.reps_min!).toBeLessThanOrEqual(result.reps_max!)
      })
    }
  }

  it("principiante has fewer or equal sets than avanzado for ganar_masa_muscular", () => {
    const beginner = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "ganar_masa_muscular", "principiante")
    const advanced = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "ganar_masa_muscular", "avanzado")
    expect(beginner.sets).toBeLessThanOrEqual(advanced.sets)
  })

  it("mejorar_resistencia has higher reps than ganar_masa_muscular", () => {
    const endurance = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "mejorar_resistencia", "intermedio")
    const hypertrophy = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "ganar_masa_muscular", "intermedio")
    expect(endurance.reps_max!).toBeGreaterThan(hypertrophy.reps_max!)
  })

  it("bajar_grasa has shorter rest than ganar_masa_muscular (avanzado)", () => {
    const fatLoss = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "bajar_grasa", "avanzado")
    const hypertrophy = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "ganar_masa_muscular", "avanzado")
    expect(fatLoss.rest_seconds).toBeLessThanOrEqual(hypertrophy.rest_seconds)
  })
})

// ── prescribeExercise — duration-based ────────────────────────────────────────

describe("prescribeExercise — cardio / duration-based exercises", () => {
  for (const goal of GOALS) {
    for (const experience of EXPERIENCES) {
      it(`${goal} × ${experience}: reps are null, duration is set`, () => {
        const result = prescribeExercise(EXERCISE_ID, CARDIO_EXERCISE, goal, experience)

        expect(result.exercise_id).toBe(EXERCISE_ID)
        expect(result.sets).toBeGreaterThanOrEqual(1)
        expect(result.reps_min).toBeNull()
        expect(result.reps_max).toBeNull()
        expect(result.duration_seconds).not.toBeNull()
        expect(result.duration_seconds).toBeGreaterThanOrEqual(1)
        expect(result.rest_seconds).toBeGreaterThanOrEqual(0)
        expect(result.rir).toBeNull()
        expect(result.notes).toBeNull()
      })
    }
  }

  it("mejorar_resistencia cardio has longer duration than ganar_masa_muscular (avanzado)", () => {
    const endurance = prescribeExercise(EXERCISE_ID, CARDIO_EXERCISE, "mejorar_resistencia", "avanzado")
    const hypertrophy = prescribeExercise(EXERCISE_ID, CARDIO_EXERCISE, "ganar_masa_muscular", "avanzado")
    expect(endurance.duration_seconds!).toBeGreaterThanOrEqual(hypertrophy.duration_seconds!)
  })
})

// ── Default fallback ───────────────────────────────────────────────────────────

describe("prescribeExercise — unknown goal/experience fallback", () => {
  it("unknown goal returns safe defaults for rep-based exercise", () => {
    const result = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "unknown_goal", "principiante")
    expect(result.sets).toBeGreaterThanOrEqual(1)
    expect(result.reps_min).not.toBeNull()
    expect(result.reps_max).not.toBeNull()
    expect(result.duration_seconds).toBeNull()
    expect(result.rest_seconds).toBeGreaterThanOrEqual(0)
  })

  it("unknown experience returns safe defaults for rep-based exercise", () => {
    const result = prescribeExercise(EXERCISE_ID, REP_EXERCISE, "ganar_masa_muscular", "unknown_exp")
    expect(result.sets).toBeGreaterThanOrEqual(1)
    expect(result.reps_min).not.toBeNull()
    expect(result.reps_max).not.toBeNull()
  })

  it("unknown goal returns safe defaults for duration-based exercise", () => {
    const result = prescribeExercise(EXERCISE_ID, CARDIO_EXERCISE, "unknown_goal", "intermedio")
    expect(result.sets).toBeGreaterThanOrEqual(1)
    expect(result.duration_seconds).not.toBeNull()
    expect(result.reps_min).toBeNull()
    expect(result.reps_max).toBeNull()
  })
})

// ── getExerciseCountBounds — full matrix ──────────────────────────────────────

describe("getExerciseCountBounds — days_per_week × experience matrix", () => {
  // Target product ranges (intermedio baseline):
  //   2 days: 6–8   3 days: 5–7   4 days: 5–7
  //   5 days: 4–6   6 days: 4–6   7 days: 3–5

  it("2 days × intermedio → min≥6, max≥6", () => {
    const { min, max } = getExerciseCountBounds(2, "intermedio")
    expect(min).toBeGreaterThanOrEqual(6)
    expect(max).toBeGreaterThanOrEqual(6)
  })

  it("3 days × intermedio → NOT max=4 (regression from old flat function)", () => {
    const { max } = getExerciseCountBounds(3, "intermedio")
    expect(max).toBeGreaterThan(4)
  })

  it("3 days × intermedio Full Body → min≥5, max≥5", () => {
    const { min, max } = getExerciseCountBounds(3, "intermedio")
    expect(min).toBeGreaterThanOrEqual(5)
    expect(max).toBeGreaterThanOrEqual(5)
  })

  it("5 days × intermedio → reasonable range [4, 6]", () => {
    const { min, max } = getExerciseCountBounds(5, "intermedio")
    expect(min).toBe(4)
    expect(max).toBe(6)
  })

  it("7 days × intermedio → [3, 5] (fewest per day at highest frequency)", () => {
    const { min, max } = getExerciseCountBounds(7, "intermedio")
    expect(min).toBe(3)
    expect(max).toBe(5)
  })

  // Verify principiante is at lower end, avanzado at upper
  it("principiante has lower or equal max than intermedio for same days", () => {
    for (const days of [2, 3, 4, 5, 6, 7]) {
      const p = getExerciseCountBounds(days, "principiante")
      const i = getExerciseCountBounds(days, "intermedio")
      expect(p.max).toBeLessThanOrEqual(i.max)
    }
  })

  it("avanzado has higher or equal max than principiante for same days", () => {
    for (const days of [2, 3, 4, 5, 6, 7]) {
      const p = getExerciseCountBounds(days, "principiante")
      const a = getExerciseCountBounds(days, "avanzado")
      expect(a.max).toBeGreaterThanOrEqual(p.max)
    }
  })

  it("max is always strictly greater than min", () => {
    for (const days of [2, 3, 4, 5, 6, 7]) {
      for (const exp of [...EXPERIENCES, "unknown"]) {
        const { min, max } = getExerciseCountBounds(days, exp)
        expect(max).toBeGreaterThan(min)
      }
    }
  })

  it("min is always at least 1", () => {
    for (const days of [2, 3, 4, 5, 6, 7]) {
      for (const exp of [...EXPERIENCES]) {
        const { min } = getExerciseCountBounds(days, exp)
        expect(min).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it("higher frequency days have lower or equal max than lower frequency days (intermedio)", () => {
    // Volume per session decreases as frequency increases
    const bounds = [2, 3, 4, 5, 6, 7].map((d) => getExerciseCountBounds(d, "intermedio"))
    // Not strictly monotone but 2 > 7 overall
    expect(bounds[0].max).toBeGreaterThan(bounds[5].max)
  })

  // Full matrix spot checks
  it("2 principiante: min≥5", () => {
    expect(getExerciseCountBounds(2, "principiante").min).toBeGreaterThanOrEqual(5)
  })

  it("4 intermedio: matches upper/lower template (5–7)", () => {
    const { min, max } = getExerciseCountBounds(4, "intermedio")
    expect(min).toBe(5)
    expect(max).toBe(7)
  })

  it("6 avanzado: max is 6", () => {
    expect(getExerciseCountBounds(6, "avanzado").max).toBe(6)
  })

  it("unknown experience falls back safely (not below 1)", () => {
    const { min, max } = getExerciseCountBounds(3, "desconocido")
    expect(min).toBeGreaterThanOrEqual(1)
    expect(max).toBeGreaterThan(min)
  })

  it("unknown days_per_week falls back safely", () => {
    const { min, max } = getExerciseCountBounds(99, "intermedio")
    expect(min).toBeGreaterThanOrEqual(1)
    expect(max).toBeGreaterThan(min)
  })
})

// ── Integration: no null sets after selection + prescription ──────────────────

describe("Integration: selection + prescription produces no null required fields", () => {
  const SELECTED_IDS = [
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000003",
    "00000000-0000-0000-0000-000000000004",
    "00000000-0000-0000-0000-000000000005",
  ]

  const CANDIDATE_MAP = new Map([
    ["00000000-0000-0000-0000-000000000001", { body_part: "chest" }],
    ["00000000-0000-0000-0000-000000000002", { body_part: "back" }],
    ["00000000-0000-0000-0000-000000000003", { body_part: "upper legs" }],
    ["00000000-0000-0000-0000-000000000004", { body_part: "cardio" }],
    ["00000000-0000-0000-0000-000000000005", { body_part: "shoulders" }],
  ])

  it("Legs+Upper batch (the batch that previously failed with null sets) — no null sets", () => {
    const prescribed = SELECTED_IDS.map((id) => {
      const meta = CANDIDATE_MAP.get(id)!
      return prescribeExercise(id, meta, "ganar_masa_muscular", "intermedio")
    })

    for (const ex of prescribed) {
      expect(ex.sets).not.toBeNull()
      expect(ex.sets).toBeGreaterThanOrEqual(1)
      expect(ex.rest_seconds).not.toBeNull()
      expect(ex.rest_seconds).toBeGreaterThanOrEqual(0)
      const hasReps = ex.reps_min !== null && ex.reps_max !== null
      const hasDuration = ex.duration_seconds !== null
      expect(hasReps !== hasDuration).toBe(true)
    }
  })

  it("Push+Pull batch (regression: batch 1 that already worked) — still valid", () => {
    const pushPullIds = [
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002",
    ]
    const prescribed = pushPullIds.map((id) => {
      const meta = CANDIDATE_MAP.get(id)!
      return prescribeExercise(id, meta, "ganar_masa_muscular", "intermedio")
    })

    for (const ex of prescribed) {
      expect(ex.sets).toBeGreaterThanOrEqual(1)
      expect(ex.reps_min).not.toBeNull()
      expect(ex.reps_max).not.toBeNull()
      expect(ex.duration_seconds).toBeNull()
    }
  })

  it("all 4 goals produce valid prescriptions for a mixed batch", () => {
    for (const goal of GOALS) {
      const prescribed = SELECTED_IDS.map((id) => {
        const meta = CANDIDATE_MAP.get(id)!
        return prescribeExercise(id, meta, goal, "intermedio")
      })

      for (const ex of prescribed) {
        expect(ex.sets).toBeGreaterThanOrEqual(1)
        expect(ex.rest_seconds).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("3-day Full Body intermedio: count bounds allow 5–7 exercises (not 3–4)", () => {
    const { min, max } = getExerciseCountBounds(3, "intermedio")
    // Prescribe max exercises for a Full Body day
    const exercisesToPrescribe = SELECTED_IDS.slice(0, max)
    const prescribed = exercisesToPrescribe.map((id) => {
      const meta = CANDIDATE_MAP.get(id)!
      return prescribeExercise(id, meta, "mejorar_condicion_general", "intermedio")
    })

    expect(prescribed.length).toBeGreaterThanOrEqual(min)
    for (const ex of prescribed) {
      expect(ex.sets).toBeGreaterThanOrEqual(1)
      expect(ex.rest_seconds).toBeGreaterThanOrEqual(0)
    }
  })

  it("volume stays coherent: 7 days has fewer max exercises than 2 days", () => {
    const twoDays = getExerciseCountBounds(2, "intermedio")
    const sevenDays = getExerciseCountBounds(7, "intermedio")
    expect(sevenDays.max).toBeLessThan(twoDays.max)
  })
})
