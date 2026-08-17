/**
 * Tests for workout-split.ts — deterministic split builder.
 */

import { describe, it, expect } from "vitest"
import { buildWorkoutSplit, buildBatches } from "@/lib/workouts/ai/workout-split"

// ── buildWorkoutSplit ──────────────────────────────────────────────────────────

describe("buildWorkoutSplit", () => {
  describe("determinism", () => {
    it("same inputs always produce identical output", () => {
      const a = buildWorkoutSplit(4, "ganar_masa_muscular")
      const b = buildWorkoutSplit(4, "ganar_masa_muscular")
      expect(a).toEqual(b)
    })

    it("different goals produce different splits for same day count", () => {
      const hyp = buildWorkoutSplit(3, "ganar_masa_muscular")
      const fat = buildWorkoutSplit(3, "bajar_grasa")
      // Names and/or focus may differ
      const hypNames = hyp.map((d) => d.name)
      const fatNames = fat.map((d) => d.name)
      // They should still both have 3 days
      expect(hypNames).toHaveLength(3)
      expect(fatNames).toHaveLength(3)
    })
  })

  describe("day_number assignment", () => {
    it("day_numbers start at 1 and are consecutive", () => {
      for (const days of [2, 3, 4, 5, 6, 7]) {
        const split = buildWorkoutSplit(days, "ganar_masa_muscular")
        const numbers = split.map((d) => d.day_number)
        for (let i = 0; i < days; i++) {
          expect(numbers[i]).toBe(i + 1)
        }
      }
    })

    it("produces exactly daysPerWeek days", () => {
      for (const days of [2, 3, 4, 5, 6, 7]) {
        const split = buildWorkoutSplit(days, "ganar_masa_muscular")
        expect(split).toHaveLength(days)
      }
    })
  })

  describe("day names", () => {
    it("2-day hypertrophy split uses Full Body", () => {
      const split = buildWorkoutSplit(2, "ganar_masa_muscular")
      expect(split[0].name).toBe("Full Body")
      expect(split[1].name).toBe("Full Body")
    })

    it("3-day hypertrophy split uses Push/Pull/Legs", () => {
      const split = buildWorkoutSplit(3, "ganar_masa_muscular")
      expect(split[0].name).toBe("Push")
      expect(split[1].name).toBe("Pull")
      expect(split[2].name).toBe("Legs")
    })

    it("4-day hypertrophy split uses Upper/Lower", () => {
      const split = buildWorkoutSplit(4, "ganar_masa_muscular")
      expect(split[0].name).toBe("Upper")
      expect(split[1].name).toBe("Lower")
      expect(split[2].name).toBe("Upper")
      expect(split[3].name).toBe("Lower")
    })
  })

  describe("focus arrays", () => {
    it("every day has at least one focus body_part", () => {
      const split = buildWorkoutSplit(5, "ganar_masa_muscular")
      for (const day of split) {
        expect(day.focus.length).toBeGreaterThan(0)
      }
    })

    it("Push days include chest in focus", () => {
      const split = buildWorkoutSplit(3, "ganar_masa_muscular")
      const pushDay = split.find((d) => d.name === "Push")
      expect(pushDay?.focus).toContain("chest")
    })

    it("Legs days include upper legs in focus", () => {
      const split = buildWorkoutSplit(3, "ganar_masa_muscular")
      const legsDay = split.find((d) => d.name === "Legs")
      expect(legsDay?.focus).toContain("upper legs")
    })
  })

  describe("goal variants", () => {
    it("bajar_grasa produces valid split for all day counts", () => {
      for (const days of [2, 3, 4, 5, 6, 7]) {
        const split = buildWorkoutSplit(days, "bajar_grasa")
        expect(split).toHaveLength(days)
        expect(split[0].day_number).toBe(1)
      }
    })

    it("mejorar_resistencia produces valid split for all day counts", () => {
      for (const days of [2, 3, 4, 5, 6, 7]) {
        const split = buildWorkoutSplit(days, "mejorar_resistencia")
        expect(split).toHaveLength(days)
      }
    })

    it("mejorar_condicion_general produces valid split", () => {
      const split = buildWorkoutSplit(3, "mejorar_condicion_general")
      expect(split).toHaveLength(3)
    })

    it("unknown goal falls back to a valid split", () => {
      const split = buildWorkoutSplit(3, "unknown_goal")
      expect(split).toHaveLength(3)
      for (const d of split) {
        expect(d.focus.length).toBeGreaterThan(0)
      }
    })
  })
})

// ── buildBatches ──────────────────────────────────────────────────────────────

describe("buildBatches", () => {
  it("1 day → 1 batch with 1 day", () => {
    const split = buildWorkoutSplit(2, "ganar_masa_muscular").slice(0, 1)
    const batches = buildBatches(split)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(1)
  })

  it("2 days → 1 batch with 2 days", () => {
    const split = buildWorkoutSplit(2, "ganar_masa_muscular")
    const batches = buildBatches(split)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toHaveLength(2)
  })

  it("3 days → 2 batches (2 + 1)", () => {
    const split = buildWorkoutSplit(3, "ganar_masa_muscular")
    const batches = buildBatches(split)
    expect(batches).toHaveLength(2)
    expect(batches[0]).toHaveLength(2)
    expect(batches[1]).toHaveLength(1)
  })

  it("4 days → 2 batches (2 + 2)", () => {
    const split = buildWorkoutSplit(4, "ganar_masa_muscular")
    const batches = buildBatches(split)
    expect(batches).toHaveLength(2)
    expect(batches[0]).toHaveLength(2)
    expect(batches[1]).toHaveLength(2)
  })

  it("5 days → 3 batches (2 + 2 + 1)", () => {
    const split = buildWorkoutSplit(5, "ganar_masa_muscular")
    const batches = buildBatches(split)
    expect(batches).toHaveLength(3)
    expect(batches[0]).toHaveLength(2)
    expect(batches[1]).toHaveLength(2)
    expect(batches[2]).toHaveLength(1)
  })

  it("6 days → 3 batches (2 + 2 + 2)", () => {
    const split = buildWorkoutSplit(6, "ganar_masa_muscular")
    const batches = buildBatches(split)
    expect(batches).toHaveLength(3)
    for (const batch of batches) {
      expect(batch).toHaveLength(2)
    }
  })

  it("7 days → 4 batches (2 + 2 + 2 + 1)", () => {
    const split = buildWorkoutSplit(7, "ganar_masa_muscular")
    const batches = buildBatches(split)
    expect(batches).toHaveLength(4)
    expect(batches[0]).toHaveLength(2)
    expect(batches[1]).toHaveLength(2)
    expect(batches[2]).toHaveLength(2)
    expect(batches[3]).toHaveLength(1)
  })

  it("each batch contains at most 2 days", () => {
    for (const days of [2, 3, 4, 5, 6, 7]) {
      const split = buildWorkoutSplit(days, "ganar_masa_muscular")
      const batches = buildBatches(split)
      for (const batch of batches) {
        expect(batch.length).toBeLessThanOrEqual(2)
        expect(batch.length).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it("all days are preserved across all batches", () => {
    const split = buildWorkoutSplit(5, "ganar_masa_muscular")
    const batches = buildBatches(split)
    const allDays = batches.flat()
    expect(allDays).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      expect(allDays[i].day_number).toBe(i + 1)
    }
  })

  it("batch order matches split order", () => {
    const split = buildWorkoutSplit(4, "ganar_masa_muscular")
    const batches = buildBatches(split)
    const batchedDayNumbers = batches.flat().map((d) => d.day_number)
    expect(batchedDayNumbers).toEqual([1, 2, 3, 4])
  })

  it("is deterministic for same input", () => {
    const split = buildWorkoutSplit(5, "ganar_masa_muscular")
    const a = buildBatches(split)
    const b = buildBatches(split)
    expect(a).toEqual(b)
  })
})
