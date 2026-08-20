/**
 * Tests for fitness-data.ts — toProfileInsert and toUserProfile
 * covering training_environment and available_equipment round-trip.
 */

import { describe, it, expect } from "vitest"
import { toProfileInsert, toUserProfile } from "@/lib/fitness-data"
import type { UserProfile } from "@/types"
import type { ProfileRow } from "@/lib/fitness-data"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = "00000000-0000-0000-0000-000000000001"
const USERNAME = "testuser"

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    nombre: "Test",
    edad: 30,
    sexo: "masculino",
    peso_kg: 80,
    altura_cm: 175,
    experiencia: "intermedio",
    objetivo: "ganar_masa_muscular",
    dias_por_semana: 3,
    entorno: null,
    equipo_disponible: null,
    ...overrides,
  }
}

function baseRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: USER_ID,
    username: USERNAME,
    full_name: "Test",
    age: 30,
    sex: "masculino",
    weight_kg: 80,
    height_cm: 175,
    experience: "intermedio",
    goal: "ganar_masa_muscular",
    days_per_week: 3,
    bmi: null,
    bmi_category: null,
    is_admin: null,
    training_environment: null,
    available_equipment: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

// ── toProfileInsert ───────────────────────────────────────────────────────────

describe("toProfileInsert — training_environment", () => {
  it("gym → persists 'gym'", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ entorno: "gym" }))
    expect(payload.training_environment).toBe("gym")
  })

  it("home → persists 'home'", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ entorno: "home" }))
    expect(payload.training_environment).toBe("home")
  })

  it("hybrid → persists 'hybrid'", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ entorno: "hybrid" }))
    expect(payload.training_environment).toBe("hybrid")
  })

  it("null → persists null (legacy user)", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ entorno: null }))
    expect(payload.training_environment).toBeNull()
  })
})

describe("toProfileInsert — available_equipment", () => {
  it("gym + null equipment → persists []", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ entorno: "gym", equipo_disponible: null }))
    expect(payload.available_equipment).toEqual([])
    expect(Array.isArray(payload.available_equipment)).toBe(true)
  })

  it("gym + empty array explicitly → persists []", () => {
    // equipo_disponible=[] is falsy in JS but should still produce []
    const profile = baseProfile({ entorno: "gym", equipo_disponible: [] as UserProfile["equipo_disponible"] })
    const payload = toProfileInsert(USER_ID, USERNAME, profile)
    expect(payload.available_equipment).toEqual([])
  })

  it("home + ['bodyweight'] → persists ['bodyweight']", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({
      entorno: "home",
      equipo_disponible: ["bodyweight"],
    }))
    expect(payload.available_equipment).toEqual(["bodyweight"])
  })

  it("home + ['bodyweight', 'dumbbell'] → persists both", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({
      entorno: "home",
      equipo_disponible: ["bodyweight", "dumbbell"],
    }))
    expect(payload.available_equipment).toEqual(["bodyweight", "dumbbell"])
  })

  it("home + all valid equipment → persists all", () => {
    const all: UserProfile["equipo_disponible"] = [
      "bodyweight", "dumbbell", "barbell", "bench", "resistance_band", "kettlebell", "pullup_bar",
    ]
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({
      entorno: "home",
      equipo_disponible: all,
    }))
    expect(payload.available_equipment).toEqual(all)
  })

  it("invalid equipment values are stripped before persisting", () => {
    // Force invalid value via type cast (simulates corrupted state)
    const dirty = ["bodyweight", "invalid_device"] as UserProfile["equipo_disponible"]
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ equipo_disponible: dirty }))
    expect(payload.available_equipment).toEqual(["bodyweight"])
    expect(payload.available_equipment).not.toContain("invalid_device")
  })

  it("available_equipment is never null in payload", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ equipo_disponible: null }))
    expect(payload.available_equipment).not.toBeNull()
    expect(Array.isArray(payload.available_equipment)).toBe(true)
  })

  it("available_equipment is never undefined in payload", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({ equipo_disponible: null }))
    expect(payload.available_equipment).not.toBeUndefined()
  })

  it("persists both training_environment and available_equipment together", () => {
    const payload = toProfileInsert(USER_ID, USERNAME, baseProfile({
      entorno: "home",
      equipo_disponible: ["bodyweight", "dumbbell"],
    }))
    expect(payload.training_environment).toBe("home")
    expect(payload.available_equipment).toEqual(["bodyweight", "dumbbell"])
  })
})

// ── toUserProfile ─────────────────────────────────────────────────────────────

describe("toUserProfile — training_environment restore", () => {
  it("'gym' from DB → entorno: 'gym'", () => {
    const profile = toUserProfile(baseRow({ training_environment: "gym" }))
    expect(profile.entorno).toBe("gym")
  })

  it("'home' from DB → entorno: 'home'", () => {
    const profile = toUserProfile(baseRow({ training_environment: "home" }))
    expect(profile.entorno).toBe("home")
  })

  it("'hybrid' from DB → entorno: 'hybrid'", () => {
    const profile = toUserProfile(baseRow({ training_environment: "hybrid" }))
    expect(profile.entorno).toBe("hybrid")
  })

  it("null from DB (legacy user) → entorno: null", () => {
    const profile = toUserProfile(baseRow({ training_environment: null }))
    expect(profile.entorno).toBeNull()
  })
})

describe("toUserProfile — available_equipment restore", () => {
  it("empty array from DB → equipo_disponible: null", () => {
    const profile = toUserProfile(baseRow({ available_equipment: [] }))
    expect(profile.equipo_disponible).toBeNull()
  })

  it("['bodyweight'] from DB → equipo_disponible: ['bodyweight']", () => {
    const profile = toUserProfile(baseRow({ available_equipment: ["bodyweight"] }))
    expect(profile.equipo_disponible).toEqual(["bodyweight"])
  })

  it("['bodyweight', 'dumbbell'] from DB → restores both", () => {
    const profile = toUserProfile(baseRow({ available_equipment: ["bodyweight", "dumbbell"] }))
    expect(profile.equipo_disponible).toEqual(["bodyweight", "dumbbell"])
  })

  it("null from DB (legacy, shouldn't happen with NOT NULL default) → equipo_disponible: null", () => {
    const profile = toUserProfile(baseRow({ available_equipment: null as unknown as string[] }))
    expect(profile.equipo_disponible).toBeNull()
  })

  it("invalid equipment values from DB are stripped on load", () => {
    const profile = toUserProfile(baseRow({ available_equipment: ["bodyweight", "mystery_device"] }))
    expect(profile.equipo_disponible).toEqual(["bodyweight"])
    expect(profile.equipo_disponible).not.toContain("mystery_device")
  })

  it("restores both entorno and equipo_disponible together", () => {
    const profile = toUserProfile(baseRow({
      training_environment: "home",
      available_equipment: ["bodyweight", "dumbbell"],
    }))
    expect(profile.entorno).toBe("home")
    expect(profile.equipo_disponible).toEqual(["bodyweight", "dumbbell"])
  })
})

// ── Round-trip: DB row → UserProfile → DB payload ─────────────────────────────

describe("round-trip: toUserProfile → toProfileInsert", () => {
  it("gym profile round-trips cleanly", () => {
    const row = baseRow({ training_environment: "gym", available_equipment: [] })
    const profile = toUserProfile(row)
    const payload = toProfileInsert(USER_ID, USERNAME, profile)
    expect(payload.training_environment).toBe("gym")
    expect(payload.available_equipment).toEqual([])
  })

  it("home + equipment round-trips cleanly", () => {
    const row = baseRow({
      training_environment: "home",
      available_equipment: ["bodyweight", "dumbbell"],
    })
    const profile = toUserProfile(row)
    const payload = toProfileInsert(USER_ID, USERNAME, profile)
    expect(payload.training_environment).toBe("home")
    expect(payload.available_equipment).toEqual(["bodyweight", "dumbbell"])
  })

  it("legacy null environment round-trips cleanly", () => {
    const row = baseRow({ training_environment: null, available_equipment: [] })
    const profile = toUserProfile(row)
    const payload = toProfileInsert(USER_ID, USERNAME, profile)
    expect(payload.training_environment).toBeNull()
    expect(payload.available_equipment).toEqual([])
  })

  it("hybrid round-trips cleanly", () => {
    const row = baseRow({ training_environment: "hybrid", available_equipment: [] })
    const profile = toUserProfile(row)
    const payload = toProfileInsert(USER_ID, USERNAME, profile)
    expect(payload.training_environment).toBe("hybrid")
    expect(payload.available_equipment).toEqual([])
  })
})
