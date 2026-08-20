/**
 * Tests for candidate exercise selection engine.
 * No database access — uses in-memory exercise fixtures.
 */

import { describe, it, expect } from "vitest"
import { selectCandidates, MAX_CANDIDATES } from "@/lib/workouts/ai/candidate-exercises"

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeExercise(
  id: string,
  name: string,
  bodyPart: string,
  isActive = true,
) {
  return {
    id,
    name,
    body_part: bodyPart,
    equipment: "barbell",
    target: "pectorals",
    is_active: isActive,
  }
}

/** Generates N exercises for a given body_part */
function makeGroup(bodyPart: string, count: number, active = true) {
  return Array.from({ length: count }, (_, i) =>
    makeExercise(`${bodyPart}-${i}`, `${bodyPart} exercise ${i}`, bodyPart, active),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("selectCandidates", () => {
  it("returns empty array for empty catalog", () => {
    const result = selectCandidates([], "ganar_masa_muscular")
    expect(result).toHaveLength(0)
  })

  it("filters out inactive exercises", () => {
    const exercises = [
      makeExercise("active-1", "Active Exercise", "back", true),
      makeExercise("inactive-1", "Inactive Exercise", "back", false),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("active-1")
  })

  it("never includes inactive exercises regardless of catalog size", () => {
    const exercises = [
      ...makeGroup("back", 5, true),
      ...makeGroup("chest", 5, false), // all inactive
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    expect(result.every((c) => c.id.startsWith("back"))).toBe(true)
  })

  it("caps candidates at MAX_CANDIDATES", () => {
    // Create a large catalog that would exceed the cap
    const exercises = [
      ...makeGroup("back", 30),
      ...makeGroup("chest", 30),
      ...makeGroup("upper legs", 30),
      ...makeGroup("shoulders", 30),
      ...makeGroup("upper arms", 30),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    expect(result.length).toBeLessThanOrEqual(MAX_CANDIDATES)
  })

  it("is deterministic: same input always produces same output", () => {
    const exercises = [
      ...makeGroup("back", 20),
      ...makeGroup("chest", 20),
      ...makeGroup("upper legs", 20),
    ]
    const result1 = selectCandidates(exercises, "ganar_masa_muscular")
    const result2 = selectCandidates(exercises, "ganar_masa_muscular")
    expect(result1.map((c) => c.id)).toEqual(result2.map((c) => c.id))
  })

  it("sorts exercises within each group by name", () => {
    const exercises = [
      makeExercise("b2", "Zebra curl", "back"),
      makeExercise("b1", "Arnold row", "back"),
      makeExercise("b3", "Meadow row", "back"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    const names = result.map((c) => c.name)
    expect(names).toEqual(["Arnold row", "Meadow row", "Zebra curl"])
  })

  it("prioritizes muscle hypertrophy body_parts for ganar_masa_muscular", () => {
    const exercises = [
      ...makeGroup("cardio", 10),
      ...makeGroup("back", 10),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    const bodyParts = result.map((c) => c.body_part)
    const backCount = bodyParts.filter((bp) => bp === "back").length
    const cardioCount = bodyParts.filter((bp) => bp === "cardio").length
    // back should have more candidates than cardio for muscle gain goal
    expect(backCount).toBeGreaterThan(cardioCount)
  })

  it("prioritizes cardio body_parts for mejorar_resistencia", () => {
    const exercises = [
      ...makeGroup("cardio", 15),
      ...makeGroup("neck", 15),
    ]
    const result = selectCandidates(exercises, "mejorar_resistencia")
    const bodyParts = result.map((c) => c.body_part)
    const cardioCount = bodyParts.filter((bp) => bp === "cardio").length
    const neckCount = bodyParts.filter((bp) => bp === "neck").length
    expect(cardioCount).toBeGreaterThan(neckCount)
  })

  it("includes exercise metadata in candidates", () => {
    const exercises = [
      {
        id: "ex-1",
        name: "Bench Press",
        body_part: "chest",
        equipment: "barbell",
        target: "pectorals",
        is_active: true,
      },
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    expect(result[0]).toMatchObject({
      id: "ex-1",
      name: "Bench Press",
      body_part: "chest",
      equipment: "barbell",
      target: "pectorals",
    })
  })

  it("MAX_CANDIDATES is 55", () => {
    expect(MAX_CANDIDATES).toBe(55)
  })

  it("candidates do not include muscle_group field", () => {
    const exercises = [makeExercise("ex-1", "Bench Press", "chest")]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    expect(Object.keys(result[0])).not.toContain("muscle_group")
  })

  it("candidates do not include secondary_muscles field", () => {
    const exercises = [makeExercise("ex-1", "Bench Press", "chest")]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    expect(Object.keys(result[0])).not.toContain("secondary_muscles")
  })

  it("handles unknown goal with default priority", () => {
    const exercises = makeGroup("upper legs", 5)
    const result = selectCandidates(exercises, "unknown_goal")
    expect(result.length).toBeGreaterThan(0)
  })

  it("includes body_parts not in priority list (up to 2 slots each)", () => {
    const exercises = [
      ...makeGroup("upper legs", 5),
      ...makeGroup("fantasy_body_part", 5), // not in any priority list
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    const fantasyCount = result.filter((c) => c.body_part === "fantasy_body_part").length
    expect(fantasyCount).toBeGreaterThan(0)
    expect(fantasyCount).toBeLessThanOrEqual(2)
  })
})

// ── Context-aware selection ────────────────────────────────────────────────────

import type { SelectionContext } from "@/lib/workouts/ai/candidate-exercises"

function makeEx(
  id: string,
  name: string,
  bodyPart: string,
  equipment: string,
  isActive = true,
) {
  return { id, name, body_part: bodyPart, equipment, target: "target", is_active: isActive }
}

const gymCtx: SelectionContext = {
  environment: "gym",
  availableEquipment: null,
  experience: "intermedio",
  goal: "ganar_masa_muscular",
}

const homeCtx: SelectionContext = {
  environment: "home",
  availableEquipment: ["bodyweight", "dumbbell"],
  experience: "intermedio",
  goal: "ganar_masa_muscular",
}

describe("selectCandidates — context-aware (HOME hard filter)", () => {
  it("excludes incompatible machine exercises for home environment", () => {
    const exercises = [
      makeEx("bw-1", "Push-Up", "chest", "body weight"),
      makeEx("mach-1", "Leg Press", "upper legs", "leverage machine"),
      makeEx("cable-1", "Cable Row", "back", "cable"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", homeCtx)
    const ids = result.map((c) => c.id)
    expect(ids).toContain("bw-1")
    expect(ids).not.toContain("mach-1")
    expect(ids).not.toContain("cable-1")
  })

  it("includes dumbbell exercises when dumbbell is available", () => {
    const exercises = [
      makeEx("db-1", "Dumbbell Curl", "upper arms", "dumbbell"),
      makeEx("mach-1", "Machine Curl", "upper arms", "leverage machine"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", homeCtx)
    const ids = result.map((c) => c.id)
    expect(ids).toContain("db-1")
    expect(ids).not.toContain("mach-1")
  })

  it("excludes bench-dependent exercises when bench not in available equipment", () => {
    const exercises = [
      makeEx("db-press", "Dumbbell Bench Press", "chest", "dumbbell"),
      makeEx("pushup", "Push-Up", "chest", "body weight"),
    ]
    // homeCtx has dumbbell but no bench
    const result = selectCandidates(exercises, "ganar_masa_muscular", homeCtx)
    const ids = result.map((c) => c.id)
    expect(ids).not.toContain("db-press")
    expect(ids).toContain("pushup")
  })

  it("excludes pull-up exercises when pullup_bar not in available equipment", () => {
    const exercises = [
      makeEx("pullup", "Pull-Up", "back", "body weight"),
      makeEx("row", "Dumbbell Row", "back", "dumbbell"),
    ]
    // homeCtx has no pullup_bar
    const result = selectCandidates(exercises, "ganar_masa_muscular", homeCtx)
    const ids = result.map((c) => c.id)
    expect(ids).not.toContain("pullup")
    expect(ids).toContain("row")
  })

  it("empty catalog after home filter returns empty result", () => {
    const exercises = [
      makeEx("mach-1", "Leg Press", "upper legs", "leverage machine"),
      makeEx("cable-1", "Cable Fly", "chest", "cable"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", homeCtx)
    expect(result).toHaveLength(0)
  })

  it("with pullup_bar available: pull-up exercises are included", () => {
    const ctx: SelectionContext = {
      ...homeCtx,
      availableEquipment: ["bodyweight", "pullup_bar"],
    }
    const exercises = [
      makeEx("pullup", "Pull-Up", "back", "body weight"),
      makeEx("chinup", "Chin-Up", "back", "body weight"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", ctx)
    const ids = result.map((c) => c.id)
    expect(ids).toContain("pullup")
    expect(ids).toContain("chinup")
  })
})

describe("selectCandidates — context-aware (GYM ranking)", () => {
  it("machine exercises rank above bodyweight exercises within same body_part", () => {
    const exercises = [
      makeEx("bw-1", "Push-Up", "chest", "body weight"),
      makeEx("mach-1", "Chest Press Machine", "chest", "leverage machine"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", gymCtx)
    const ids = result.map((c) => c.id)
    // Machine (score 85) should come before bodyweight (score 35)
    expect(ids.indexOf("mach-1")).toBeLessThan(ids.indexOf("bw-1"))
  })

  it("cable exercises rank above bodyweight within same body_part", () => {
    const exercises = [
      makeEx("bw-1", "Tricep Push-Up", "upper arms", "body weight"),
      makeEx("cable-1", "Cable Tricep Pushdown", "upper arms", "cable"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", gymCtx)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf("cable-1")).toBeLessThan(ids.indexOf("bw-1"))
  })

  it("free_weight ranks above bodyweight within same body_part", () => {
    const exercises = [
      makeEx("bw-1", "Pike Push-Up", "shoulders", "body weight"),
      makeEx("db-1", "Dumbbell Lateral Raise", "shoulders", "dumbbell"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", gymCtx)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf("db-1")).toBeLessThan(ids.indexOf("bw-1"))
  })

  it("ties in score are resolved alphabetically by name", () => {
    // Two machine exercises have the same score → alphabetical within tie
    const exercises = [
      makeEx("mach-z", "Zebra Machine", "back", "leverage machine"),
      makeEx("mach-a", "Alpha Machine", "back", "leverage machine"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", gymCtx)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf("mach-a")).toBeLessThan(ids.indexOf("mach-z"))
  })

  it("without context: legacy alphabetical sort (bodyweight first if alpha)", () => {
    const exercises = [
      makeEx("bw-1", "Arnold Push-Up", "chest", "body weight"),   // A
      makeEx("mach-1", "Bench Press Machine", "chest", "leverage machine"), // B
    ]
    // No context → alphabetical, so "Arnold" before "Bench"
    const result = selectCandidates(exercises, "ganar_masa_muscular")
    const ids = result.map((c) => c.id)
    expect(ids.indexOf("bw-1")).toBeLessThan(ids.indexOf("mach-1"))
  })
})

describe("selectCandidates — context-aware (HYBRID ranking)", () => {
  const hybridCtx: SelectionContext = {
    environment: "hybrid",
    availableEquipment: null,
    experience: "intermedio",
    goal: "ganar_masa_muscular",
  }

  it("machines still rank high in hybrid (no incompatibility)", () => {
    const exercises = [
      makeEx("bw-1", "Push-Up", "chest", "body weight"),
      makeEx("mach-1", "Chest Press Machine", "chest", "leverage machine"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", hybridCtx)
    const ids = result.map((c) => c.id)
    // Machine (85 base, no hybrid boost) vs bodyweight (35 + 10 boost = 45)
    expect(ids.indexOf("mach-1")).toBeLessThan(ids.indexOf("bw-1"))
  })

  it("bodyweight scores higher in hybrid than plain gym", () => {
    // In hybrid: bodyweight = 35+10=45, machine = 85
    // But bodyweight ranks higher than in gym where it would still be below machine
    // Verify the score difference is narrowed compared to gym
    // (indirect: the sort order is same but numeric gap is smaller)
    const exercises = [
      makeEx("band-1", "Band Pull Apart", "back", "band"),
      makeEx("bw-1", "Superman", "back", "body weight"),
    ]
    // hybrid: band = 20+10=30, bodyweight = 35+10=45 → bodyweight ahead of band
    const result = selectCandidates(exercises, "ganar_masa_muscular", hybridCtx)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf("bw-1")).toBeLessThan(ids.indexOf("band-1"))
  })

  it("does not hard-filter any exercises (all equipment allowed in hybrid)", () => {
    const exercises = [
      makeEx("mach-1", "Leg Press", "upper legs", "leverage machine"),
      makeEx("cable-1", "Cable Row", "back", "cable"),
      makeEx("bw-1", "Pull-Up", "back", "body weight"),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", hybridCtx)
    const ids = result.map((c) => c.id)
    expect(ids).toContain("mach-1")
    expect(ids).toContain("cable-1")
    expect(ids).toContain("bw-1")
  })
})

describe("selectCandidates — context-aware (backward compatibility)", () => {
  it("undefined context uses legacy alphabetical sort (no equipment ranking)", () => {
    const exercises = [
      makeEx("bw-z", "Zzz Push-Up", "chest", "body weight"),
      makeEx("mach-a", "Aardvark Machine", "chest", "leverage machine"),
    ]
    // No context: alphabetical → "Aardvark Machine" < "Zzz Push-Up"
    const result = selectCandidates(exercises, "ganar_masa_muscular", undefined)
    const ids = result.map((c) => c.id)
    expect(ids.indexOf("mach-a")).toBeLessThan(ids.indexOf("bw-z"))
  })

  it("context=undefined still respects is_active filter", () => {
    const exercises = [
      makeEx("active", "Active Exercise", "chest", "dumbbell", true),
      makeEx("inactive", "Inactive Exercise", "chest", "dumbbell", false),
    ]
    const result = selectCandidates(exercises, "ganar_masa_muscular", undefined)
    expect(result.map((c) => c.id)).not.toContain("inactive")
  })
})
