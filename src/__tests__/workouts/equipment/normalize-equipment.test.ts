/**
 * Tests for normalize-equipment.ts
 * All 28+ known dataset equipment strings must map to the correct category.
 */

import { describe, it, expect } from "vitest"
import { normalizeEquipment } from "@/lib/workouts/equipment/normalize-equipment"

describe("normalizeEquipment", () => {
  // ── Bodyweight ──────────────────────────────────────────────────────────────
  it("maps 'body weight' → bodyweight", () => {
    expect(normalizeEquipment("body weight")).toBe("bodyweight")
  })

  // ── Free weight ─────────────────────────────────────────────────────────────
  it("maps 'dumbbell' → free_weight", () => {
    expect(normalizeEquipment("dumbbell")).toBe("free_weight")
  })
  it("maps 'barbell' → free_weight", () => {
    expect(normalizeEquipment("barbell")).toBe("free_weight")
  })
  it("maps 'ez barbell' → free_weight", () => {
    expect(normalizeEquipment("ez barbell")).toBe("free_weight")
  })
  it("maps 'olympic barbell' → free_weight", () => {
    expect(normalizeEquipment("olympic barbell")).toBe("free_weight")
  })
  it("maps 'trap bar' → free_weight", () => {
    expect(normalizeEquipment("trap bar")).toBe("free_weight")
  })
  it("maps 'weighted' → free_weight", () => {
    expect(normalizeEquipment("weighted")).toBe("free_weight")
  })

  // ── Cable ───────────────────────────────────────────────────────────────────
  it("maps 'cable' → cable", () => {
    expect(normalizeEquipment("cable")).toBe("cable")
  })

  // ── Machine ─────────────────────────────────────────────────────────────────
  it("maps 'leverage machine' → machine", () => {
    expect(normalizeEquipment("leverage machine")).toBe("machine")
  })
  it("maps 'sled machine' → machine", () => {
    expect(normalizeEquipment("sled machine")).toBe("machine")
  })

  // ── Smith ───────────────────────────────────────────────────────────────────
  it("maps 'smith machine' → smith", () => {
    expect(normalizeEquipment("smith machine")).toBe("smith")
  })

  // ── Assisted ────────────────────────────────────────────────────────────────
  it("maps 'assisted' → assisted", () => {
    expect(normalizeEquipment("assisted")).toBe("assisted")
  })

  // ── Band ────────────────────────────────────────────────────────────────────
  it("maps 'band' → band", () => {
    expect(normalizeEquipment("band")).toBe("band")
  })
  it("maps 'resistance band' → band", () => {
    expect(normalizeEquipment("resistance band")).toBe("band")
  })

  // ── Functional ──────────────────────────────────────────────────────────────
  it("maps 'kettlebell' → functional", () => {
    expect(normalizeEquipment("kettlebell")).toBe("functional")
  })
  it("maps 'medicine ball' → functional", () => {
    expect(normalizeEquipment("medicine ball")).toBe("functional")
  })
  it("maps 'rope' → functional", () => {
    expect(normalizeEquipment("rope")).toBe("functional")
  })
  it("maps 'stability ball' → functional", () => {
    expect(normalizeEquipment("stability ball")).toBe("functional")
  })
  it("maps 'bosu ball' → functional", () => {
    expect(normalizeEquipment("bosu ball")).toBe("functional")
  })
  it("maps 'tire' → functional", () => {
    expect(normalizeEquipment("tire")).toBe("functional")
  })
  it("maps 'hammer' → functional", () => {
    expect(normalizeEquipment("hammer")).toBe("functional")
  })

  // ── Cardio ──────────────────────────────────────────────────────────────────
  it("maps 'stationary bike' → cardio", () => {
    expect(normalizeEquipment("stationary bike")).toBe("cardio")
  })
  it("maps 'skierg machine' → cardio", () => {
    expect(normalizeEquipment("skierg machine")).toBe("cardio")
  })
  it("maps 'upper body ergometer' → cardio", () => {
    expect(normalizeEquipment("upper body ergometer")).toBe("cardio")
  })
  it("maps 'stepmill machine' → cardio", () => {
    expect(normalizeEquipment("stepmill machine")).toBe("cardio")
  })
  it("maps 'elliptical machine' → cardio", () => {
    expect(normalizeEquipment("elliptical machine")).toBe("cardio")
  })

  // ── Other ───────────────────────────────────────────────────────────────────
  it("maps 'roller' → other", () => {
    expect(normalizeEquipment("roller")).toBe("other")
  })
  it("maps 'wheel roller' → other", () => {
    expect(normalizeEquipment("wheel roller")).toBe("other")
  })

  // ── Fallback ─────────────────────────────────────────────────────────────────
  it("maps unknown equipment string → other", () => {
    expect(normalizeEquipment("mystery contraption")).toBe("other")
  })
  it("maps empty string → other", () => {
    expect(normalizeEquipment("")).toBe("other")
  })

  // ── Case-insensitive ─────────────────────────────────────────────────────────
  it("is case-insensitive (Dumbbell → free_weight)", () => {
    expect(normalizeEquipment("Dumbbell")).toBe("free_weight")
  })
  it("is case-insensitive (CABLE → cable)", () => {
    expect(normalizeEquipment("CABLE")).toBe("cable")
  })
  it("trims whitespace (  barbell  → free_weight)", () => {
    expect(normalizeEquipment("  barbell  ")).toBe("free_weight")
  })
})
