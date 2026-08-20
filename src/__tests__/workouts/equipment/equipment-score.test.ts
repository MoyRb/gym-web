/**
 * Tests for equipment-score.ts
 *
 * Covers:
 *  - isCompatibleWithHomeEquipment: raw, secondary bench/pullup deps, weighted rule
 *  - scoreExerciseForContext: gym (base, experience mods, goal mods), home, hybrid
 *  - checkBodyweightBalance: gym threshold, non-gym short-circuits
 */

import { describe, it, expect } from "vitest"
import {
  isCompatibleWithHomeEquipment,
  scoreExerciseForContext,
  checkBodyweightBalance,
  HOME_EXCLUDE_SCORE,
  BODYWEIGHT_GYM_THRESHOLD_PCT,
} from "@/lib/workouts/equipment/equipment-score"
import type { SelectionContext } from "@/lib/workouts/equipment/equipment-score"

// ── Context factories ──────────────────────────────────────────────────────────

function gymCtx(overrides?: Partial<SelectionContext>): SelectionContext {
  return {
    environment: "gym",
    availableEquipment: null,
    experience: "intermedio",
    goal: "ganar_masa_muscular",
    ...overrides,
  }
}

function homeCtx(
  availableEquipment: SelectionContext["availableEquipment"],
  overrides?: Partial<SelectionContext>,
): SelectionContext {
  return {
    environment: "home",
    availableEquipment,
    experience: "intermedio",
    goal: "ganar_masa_muscular",
    ...overrides,
  }
}

function hybridCtx(overrides?: Partial<SelectionContext>): SelectionContext {
  return {
    environment: "hybrid",
    availableEquipment: null,
    experience: "intermedio",
    goal: "ganar_masa_muscular",
    ...overrides,
  }
}

// ── isCompatibleWithHomeEquipment ─────────────────────────────────────────────

describe("isCompatibleWithHomeEquipment", () => {
  // Basic raw equipment match
  it("bodyweight exercise with bodyweight available → compatible", () => {
    expect(isCompatibleWithHomeEquipment("body weight", "Push-Up", ["bodyweight"])).toBe(true)
  })

  it("dumbbell exercise with dumbbell available → compatible", () => {
    expect(isCompatibleWithHomeEquipment("dumbbell", "Dumbbell Curl", ["dumbbell"])).toBe(true)
  })

  it("barbell exercise with barbell available → compatible", () => {
    expect(isCompatibleWithHomeEquipment("barbell", "Barbell Row", ["barbell"])).toBe(true)
  })

  it("olympic barbell exercise with barbell available → compatible (barbell maps both)", () => {
    expect(isCompatibleWithHomeEquipment("olympic barbell", "Olympic Deadlift", ["barbell"])).toBe(true)
  })

  it("resistance band (raw='band') with resistance_band available → compatible", () => {
    expect(isCompatibleWithHomeEquipment("band", "Band Pull Apart", ["resistance_band"])).toBe(true)
  })

  it("resistance band (raw='resistance band') with resistance_band available → compatible", () => {
    expect(isCompatibleWithHomeEquipment("resistance band", "Resistance Band Row", ["resistance_band"])).toBe(true)
  })

  it("kettlebell exercise with kettlebell available → compatible", () => {
    expect(isCompatibleWithHomeEquipment("kettlebell", "Kettlebell Swing", ["kettlebell"])).toBe(true)
  })

  it("machine exercise with no machine at home → incompatible", () => {
    expect(isCompatibleWithHomeEquipment("leverage machine", "Leg Press", ["bodyweight"])).toBe(false)
  })

  it("cable exercise with no cable at home → incompatible", () => {
    expect(isCompatibleWithHomeEquipment("cable", "Cable Row", ["bodyweight", "dumbbell"])).toBe(false)
  })

  it("dumbbell exercise without dumbbell → incompatible", () => {
    expect(isCompatibleWithHomeEquipment("dumbbell", "Dumbbell Curl", ["bodyweight"])).toBe(false)
  })

  // Secondary dependency: bench
  it("bench-press name without bench → incompatible even with dumbbell", () => {
    expect(
      isCompatibleWithHomeEquipment("dumbbell", "Dumbbell Bench Press", ["dumbbell"]),
    ).toBe(false)
  })

  it("bench-press name with bench → compatible", () => {
    expect(
      isCompatibleWithHomeEquipment("dumbbell", "Dumbbell Bench Press", ["dumbbell", "bench"]),
    ).toBe(true)
  })

  it("incline name without bench → incompatible", () => {
    expect(
      isCompatibleWithHomeEquipment("dumbbell", "Incline Dumbbell Press", ["dumbbell"]),
    ).toBe(false)
  })

  it("incline name with bench → compatible", () => {
    expect(
      isCompatibleWithHomeEquipment("dumbbell", "Incline Dumbbell Press", ["dumbbell", "bench"]),
    ).toBe(true)
  })

  it("decline name without bench → incompatible", () => {
    expect(
      isCompatibleWithHomeEquipment("body weight", "Decline Push-Up on Bench", ["bodyweight"]),
    ).toBe(false)
  })

  // Secondary dependency: pullup_bar
  it("pull-up name without pullup_bar → incompatible", () => {
    expect(isCompatibleWithHomeEquipment("body weight", "Pull-Up", ["bodyweight"])).toBe(false)
  })

  it("pull-up name with pullup_bar → compatible", () => {
    expect(
      isCompatibleWithHomeEquipment("body weight", "Pull-Up", ["bodyweight", "pullup_bar"]),
    ).toBe(true)
  })

  it("chin-up name without pullup_bar → incompatible", () => {
    expect(isCompatibleWithHomeEquipment("body weight", "Chin-Up", ["bodyweight"])).toBe(false)
  })

  it("hanging exercise without pullup_bar → incompatible", () => {
    expect(isCompatibleWithHomeEquipment("body weight", "Hanging Leg Raise", ["bodyweight"])).toBe(false)
  })

  it("hanging exercise with pullup_bar → compatible", () => {
    expect(
      isCompatibleWithHomeEquipment("body weight", "Hanging Leg Raise", ["bodyweight", "pullup_bar"]),
    ).toBe(true)
  })

  it("toes to bar without pullup_bar → incompatible", () => {
    expect(isCompatibleWithHomeEquipment("body weight", "Toes to Bar", ["bodyweight"])).toBe(false)
  })

  // Weighted raw special rule
  it("'weighted' with bodyweight + dumbbell → compatible", () => {
    expect(
      isCompatibleWithHomeEquipment("weighted", "Weighted Dip", ["bodyweight", "dumbbell"]),
    ).toBe(true)
  })

  it("'weighted' with bodyweight + barbell → compatible", () => {
    expect(
      isCompatibleWithHomeEquipment("weighted", "Weighted Pull-Up", ["bodyweight", "barbell"]),
    ).toBe(true)
  })

  it("'weighted' with bodyweight only → incompatible (needs weight source)", () => {
    expect(isCompatibleWithHomeEquipment("weighted", "Weighted Dip", ["bodyweight"])).toBe(false)
  })

  it("'weighted' with dumbbell only → incompatible (needs bodyweight)", () => {
    expect(isCompatibleWithHomeEquipment("weighted", "Weighted Dip", ["dumbbell"])).toBe(false)
  })

  it("'weighted' with bench + dumbbell (no bodyweight) → incompatible", () => {
    expect(
      isCompatibleWithHomeEquipment("weighted", "Weighted Dip", ["bench", "dumbbell"]),
    ).toBe(false)
  })

  // Empty equipment list
  it("empty available equipment → incompatible for any non-bodyweight exercise", () => {
    expect(isCompatibleWithHomeEquipment("dumbbell", "Dumbbell Curl", [])).toBe(false)
  })

  it("empty available equipment → incompatible for bodyweight exercise too (body weight not listed)", () => {
    expect(isCompatibleWithHomeEquipment("body weight", "Push-Up", [])).toBe(false)
  })
})

// ── scoreExerciseForContext — GYM ─────────────────────────────────────────────

describe("scoreExerciseForContext — gym", () => {
  it("machine, intermedio, ganar_masa_muscular → 85 (base)", () => {
    expect(scoreExerciseForContext("leverage machine", "Leg Press", gymCtx())).toBe(85)
  })

  it("cable, intermedio, ganar_masa_muscular → 85 (base)", () => {
    expect(scoreExerciseForContext("cable", "Cable Row", gymCtx())).toBe(85)
  })

  it("free_weight (dumbbell), intermedio, ganar_masa_muscular → 80", () => {
    expect(scoreExerciseForContext("dumbbell", "Dumbbell Curl", gymCtx())).toBe(80)
  })

  it("bodyweight, intermedio, ganar_masa_muscular → 35 (deprioritized)", () => {
    expect(scoreExerciseForContext("body weight", "Push-Up", gymCtx())).toBe(35)
  })

  it("band, intermedio, ganar_masa_muscular → 20 (lowest)", () => {
    expect(scoreExerciseForContext("band", "Band Pull Apart", gymCtx())).toBe(20)
  })

  // Experience modifiers — principiante
  it("machine, principiante → 100 (85 base + 15 exp mod, capped)", () => {
    expect(
      scoreExerciseForContext("leverage machine", "Leg Press", gymCtx({ experience: "principiante" })),
    ).toBe(100)
  })

  it("assisted, principiante → 85 (70 base + 15 exp mod)", () => {
    expect(
      scoreExerciseForContext("assisted", "Assisted Pull-Up", gymCtx({ experience: "principiante" })),
    ).toBe(85)
  })

  it("free_weight, principiante → 70 (80 base - 10 exp mod)", () => {
    expect(
      scoreExerciseForContext("dumbbell", "Dumbbell Row", gymCtx({ experience: "principiante" })),
    ).toBe(70)
  })

  it("smith, principiante → 85 (75 base + 10 exp mod)", () => {
    expect(
      scoreExerciseForContext("smith machine", "Smith Machine Squat", gymCtx({ experience: "principiante" })),
    ).toBe(85)
  })

  // Experience modifiers — avanzado
  it("free_weight, avanzado → 90 (80 base + 10 exp mod)", () => {
    expect(
      scoreExerciseForContext("barbell", "Barbell Squat", gymCtx({ experience: "avanzado" })),
    ).toBe(90)
  })

  it("bodyweight, avanzado → 50 (35 base + 15 exp mod)", () => {
    expect(
      scoreExerciseForContext("body weight", "Dip", gymCtx({ experience: "avanzado" })),
    ).toBe(50)
  })

  it("machine, avanzado → 80 (85 base - 5 exp mod)", () => {
    expect(
      scoreExerciseForContext("leverage machine", "Leg Press", gymCtx({ experience: "avanzado" })),
    ).toBe(80)
  })

  // Goal modifiers
  it("bodyweight, intermedio, bajar_grasa → 45 (35 + 10 goal mod)", () => {
    expect(
      scoreExerciseForContext("body weight", "Push-Up", gymCtx({ goal: "bajar_grasa" })),
    ).toBe(45)
  })

  it("cardio, intermedio, bajar_grasa → 55 (40 + 15 goal mod)", () => {
    expect(
      scoreExerciseForContext("stationary bike", "Stationary Bike", gymCtx({ goal: "bajar_grasa" })),
    ).toBe(55)
  })

  it("bodyweight, intermedio, mejorar_resistencia → 50 (35 + 15 goal mod)", () => {
    expect(
      scoreExerciseForContext("body weight", "Push-Up", gymCtx({ goal: "mejorar_resistencia" })),
    ).toBe(50)
  })

  it("cardio, intermedio, mejorar_resistencia → 65 (40 + 25 goal mod)", () => {
    expect(
      scoreExerciseForContext("stationary bike", "Stationary Bike", gymCtx({ goal: "mejorar_resistencia" })),
    ).toBe(65)
  })

  it("functional, intermedio, mejorar_resistencia → 70 (55 + 15 goal mod)", () => {
    expect(
      scoreExerciseForContext("kettlebell", "Kettlebell Swing", gymCtx({ goal: "mejorar_resistencia" })),
    ).toBe(70)
  })

  it("band, intermedio, mejorar_resistencia → 30 (20 + 10 goal mod)", () => {
    expect(
      scoreExerciseForContext("band", "Band Pull Apart", gymCtx({ goal: "mejorar_resistencia" })),
    ).toBe(30)
  })

  // Combined experience + goal
  it("bodyweight, avanzado, bajar_grasa → 60 (35 + 15 exp + 10 goal)", () => {
    expect(
      scoreExerciseForContext(
        "body weight", "Dip",
        gymCtx({ experience: "avanzado", goal: "bajar_grasa" }),
      ),
    ).toBe(60)
  })

  it("cardio, principiante, mejorar_condicion_general → 50 (40 + 0 exp + 10 goal)", () => {
    expect(
      scoreExerciseForContext(
        "stationary bike", "Stationary Bike",
        gymCtx({ experience: "principiante", goal: "mejorar_condicion_general" }),
      ),
    ).toBe(50)
  })

  // Unknown equipment → "other" category (base 45)
  it("unknown raw equipment maps to 'other' → 45 base score", () => {
    expect(
      scoreExerciseForContext("mystery device", "Mystery Exercise", gymCtx()),
    ).toBe(45)
  })
})

// ── scoreExerciseForContext — HOME ────────────────────────────────────────────

describe("scoreExerciseForContext — home", () => {
  it("compatible bodyweight exercise → 50 (neutral)", () => {
    expect(
      scoreExerciseForContext("body weight", "Push-Up", homeCtx(["bodyweight"])),
    ).toBe(50)
  })

  it("compatible dumbbell exercise → 50 (neutral)", () => {
    expect(
      scoreExerciseForContext("dumbbell", "Dumbbell Curl", homeCtx(["dumbbell"])),
    ).toBe(50)
  })

  it("incompatible machine exercise → HOME_EXCLUDE_SCORE", () => {
    expect(
      scoreExerciseForContext("leverage machine", "Leg Press", homeCtx(["bodyweight"])),
    ).toBe(HOME_EXCLUDE_SCORE)
  })

  it("incompatible cable exercise → HOME_EXCLUDE_SCORE", () => {
    expect(
      scoreExerciseForContext("cable", "Cable Row", homeCtx(["bodyweight", "dumbbell"])),
    ).toBe(HOME_EXCLUDE_SCORE)
  })

  it("bench-dependent exercise without bench → HOME_EXCLUDE_SCORE", () => {
    expect(
      scoreExerciseForContext("dumbbell", "Incline Dumbbell Press", homeCtx(["dumbbell"])),
    ).toBe(HOME_EXCLUDE_SCORE)
  })

  it("bench-dependent exercise with bench → 50 (neutral)", () => {
    expect(
      scoreExerciseForContext("dumbbell", "Incline Dumbbell Press", homeCtx(["dumbbell", "bench"])),
    ).toBe(50)
  })

  it("pull-up without pullup_bar → HOME_EXCLUDE_SCORE", () => {
    expect(
      scoreExerciseForContext("body weight", "Pull-Up", homeCtx(["bodyweight"])),
    ).toBe(HOME_EXCLUDE_SCORE)
  })

  it("pull-up with pullup_bar → 50 (neutral)", () => {
    expect(
      scoreExerciseForContext("body weight", "Pull-Up", homeCtx(["bodyweight", "pullup_bar"])),
    ).toBe(50)
  })

  it("availableEquipment null → defaults to bodyweight-only filtering", () => {
    // null → treated as ["bodyweight"], bodyweight exercise should be compatible
    expect(
      scoreExerciseForContext("body weight", "Push-Up", homeCtx(null)),
    ).toBe(50)
  })

  it("availableEquipment null → machine incompatible (bodyweight-only fallback)", () => {
    expect(
      scoreExerciseForContext("leverage machine", "Leg Press", homeCtx(null)),
    ).toBe(HOME_EXCLUDE_SCORE)
  })
})

// ── scoreExerciseForContext — HYBRID ──────────────────────────────────────────

describe("scoreExerciseForContext — hybrid", () => {
  it("machine, intermedio, ganar_masa_muscular → 85 (no hybrid boost for machine)", () => {
    expect(scoreExerciseForContext("leverage machine", "Leg Press", hybridCtx())).toBe(85)
  })

  it("bodyweight, intermedio, ganar_masa_muscular → 45 (35 gym + 10 hybrid boost)", () => {
    expect(scoreExerciseForContext("body weight", "Push-Up", hybridCtx())).toBe(45)
  })

  it("band, intermedio, ganar_masa_muscular → 30 (20 gym + 10 hybrid boost)", () => {
    expect(scoreExerciseForContext("band", "Band Pull Apart", hybridCtx())).toBe(30)
  })

  it("functional, intermedio, ganar_masa_muscular → 60 (55 gym + 5 hybrid boost)", () => {
    expect(scoreExerciseForContext("kettlebell", "Kettlebell Swing", hybridCtx())).toBe(60)
  })

  it("cable, intermedio, ganar_masa_muscular → 85 (no hybrid boost for cable)", () => {
    expect(scoreExerciseForContext("cable", "Cable Fly", hybridCtx())).toBe(85)
  })

  it("bodyweight, avanzado, bajar_grasa → capped at 100 max", () => {
    const score = scoreExerciseForContext(
      "body weight", "Dip",
      hybridCtx({ experience: "avanzado", goal: "bajar_grasa" }),
    )
    // 35 base + 15 (avanzado) + 10 (bajar_grasa goal) + 10 (hybrid) = 70
    expect(score).toBe(70)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ── checkBodyweightBalance ────────────────────────────────────────────────────

describe("checkBodyweightBalance", () => {
  it("empty equipment list → not imbalanced, all zeros", () => {
    const result = checkBodyweightBalance([], "gym")
    expect(result.bodyweightCount).toBe(0)
    expect(result.totalCount).toBe(0)
    expect(result.ratio).toBe(0)
    expect(result.isImbalanced).toBe(false)
  })

  it("non-gym environment → always returns isImbalanced=false", () => {
    // 100% bodyweight, but not gym → not considered imbalanced
    const bwOnly = Array(10).fill("body weight")
    expect(checkBodyweightBalance(bwOnly, "home").isImbalanced).toBe(false)
    expect(checkBodyweightBalance(bwOnly, "hybrid").isImbalanced).toBe(false)
  })

  it("gym, 0/10 bodyweight → ratio=0, not imbalanced", () => {
    const result = checkBodyweightBalance(
      ["dumbbell", "cable", "leverage machine", "leverage machine",
       "barbell", "cable", "dumbbell", "barbell", "cable", "leverage machine"],
      "gym",
    )
    expect(result.bodyweightCount).toBe(0)
    expect(result.ratio).toBe(0)
    expect(result.isImbalanced).toBe(false)
  })

  it("gym, 2/10 bodyweight → ratio=0.2, under threshold, not imbalanced", () => {
    const equipment = [
      "body weight", "body weight",
      "dumbbell", "cable", "leverage machine",
      "barbell", "cable", "dumbbell", "barbell", "cable",
    ]
    const result = checkBodyweightBalance(equipment, "gym")
    expect(result.bodyweightCount).toBe(2)
    expect(result.totalCount).toBe(10)
    expect(result.ratio).toBeCloseTo(0.2)
    expect(result.isImbalanced).toBe(false)
  })

  it("gym, 3/10 bodyweight → ratio=0.3, exactly at threshold, NOT imbalanced (strict >)", () => {
    const equipment = [
      "body weight", "body weight", "body weight",
      "dumbbell", "cable", "leverage machine",
      "barbell", "cable", "dumbbell", "cable",
    ]
    const result = checkBodyweightBalance(equipment, "gym")
    expect(result.ratio).toBeCloseTo(BODYWEIGHT_GYM_THRESHOLD_PCT)
    expect(result.isImbalanced).toBe(false)
  })

  it("gym, 4/10 bodyweight → ratio=0.4, exceeds threshold, imbalanced", () => {
    const equipment = [
      "body weight", "body weight", "body weight", "body weight",
      "dumbbell", "cable", "leverage machine",
      "barbell", "cable", "dumbbell",
    ]
    const result = checkBodyweightBalance(equipment, "gym")
    expect(result.bodyweightCount).toBe(4)
    expect(result.ratio).toBeCloseTo(0.4)
    expect(result.isImbalanced).toBe(true)
  })

  it("gym, 10/10 bodyweight → fully imbalanced", () => {
    const result = checkBodyweightBalance(Array(10).fill("body weight"), "gym")
    expect(result.bodyweightCount).toBe(10)
    expect(result.ratio).toBe(1)
    expect(result.isImbalanced).toBe(true)
  })

  it("counts correctly with mixed raw strings (case-sensitive raw)", () => {
    // Only "body weight" (the exact raw string) normalizes to bodyweight
    const equipment = ["body weight", "Body Weight", "dumbbell"]
    const result = checkBodyweightBalance(equipment, "gym")
    // "Body Weight" will normalize via normalizeEquipment → trimmed+lowercased → bodyweight
    expect(result.bodyweightCount).toBe(2)
  })

  it("non-gym with imbalanced data → totalCount still reported correctly", () => {
    const result = checkBodyweightBalance(Array(5).fill("body weight"), "home")
    expect(result.totalCount).toBe(5)
    expect(result.isImbalanced).toBe(false)
  })
})

// ── Constants ──────────────────────────────────────────────────────────────────

describe("constants", () => {
  it("HOME_EXCLUDE_SCORE is a large negative sentinel", () => {
    expect(HOME_EXCLUDE_SCORE).toBe(-9999)
  })

  it("BODYWEIGHT_GYM_THRESHOLD_PCT is 0.30", () => {
    expect(BODYWEIGHT_GYM_THRESHOLD_PCT).toBe(0.30)
  })
})
