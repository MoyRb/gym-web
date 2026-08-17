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
