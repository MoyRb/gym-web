/**
 * exercise-resolver.test.ts
 *
 * Tests unitarios para exercise-resolver y sus helpers.
 * No accede a la base de datos — el cliente Supabase es mockeado.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  parseReps,
  parseRest,
  resolveExerciseName,
  resolveExerciseNames,
} from "@/lib/workouts/exercise-resolver"
import { normalizeTemplateName, EXERCISE_NAME_MAP } from "@/lib/workouts/exercise-name-map"

// ── parseReps ─────────────────────────────────────────────────────────────────

describe("parseReps", () => {
  it("parsea rango de reps", () => {
    const r = parseReps("8-10 rep")
    expect(r.repsMin).toBe(8)
    expect(r.repsMax).toBe(10)
    expect(r.durationSeconds).toBeNull()
  })

  it("parsea reps único (sin rango)", () => {
    const r = parseReps("8 rep")
    expect(r.repsMin).toBe(8)
    expect(r.repsMax).toBe(8)
    expect(r.durationSeconds).toBeNull()
  })

  it("parsea ejercicio por tiempo", () => {
    const r = parseReps("30-45 s")
    expect(r.repsMin).toBeNull()
    expect(r.repsMax).toBeNull()
    expect(r.durationSeconds).toBe(30)
  })

  it("parsea reps con sufijo adicional (por pierna)", () => {
    const r = parseReps("10-12 rep por pierna")
    expect(r.repsMin).toBe(10)
    expect(r.repsMax).toBe(12)
    expect(r.durationSeconds).toBeNull()
  })

  it("devuelve nulls para string vacío", () => {
    const r = parseReps("")
    expect(r.repsMin).toBeNull()
    expect(r.repsMax).toBeNull()
    expect(r.durationSeconds).toBeNull()
  })

  it("parsea rango alto de reps", () => {
    const r = parseReps("12-15 rep")
    expect(r.repsMin).toBe(12)
    expect(r.repsMax).toBe(15)
  })
})

// ── parseRest ─────────────────────────────────────────────────────────────────

describe("parseRest", () => {
  it("parsea descanso fijo", () => {
    expect(parseRest("90 s")).toBe(90)
  })

  it("promedia rango de descanso", () => {
    expect(parseRest("90-120 s")).toBe(105)
  })

  it("promedia rango de descanso asimétr", () => {
    expect(parseRest("120-150 s")).toBe(135)
  })

  it("devuelve 60 para string vacío", () => {
    expect(parseRest("")).toBe(60)
  })

  it("parsea descanso corto", () => {
    expect(parseRest("45 s")).toBe(45)
  })

  it("parsea rango corto", () => {
    expect(parseRest("45-60 s")).toBe(53)
  })
})

// ── normalizeTemplateName ─────────────────────────────────────────────────────

describe("normalizeTemplateName", () => {
  it("convierte a minúsculas y elimina espacios", () => {
    expect(normalizeTemplateName("  Sentadilla  ")).toBe("sentadilla")
  })

  it("mantiene acentos (parte del key del mapa)", () => {
    expect(normalizeTemplateName("Sentadilla búlgara")).toBe("sentadilla búlgara")
  })
})

// ── KNOWN_UNMAPPABLE ──────────────────────────────────────────────────────────

describe("KNOWN_UNMAPPABLE", () => {
  it("cardio continuo está mapeado a air bike (no es unmappable)", () => {
    expect(EXERCISE_NAME_MAP["cardio continuo (cinta, bici o elíptica)"]).toEqual(["air bike"])
  })

  it("incluye movilidad (sin equivalente en el dataset)", () => {
    expect(EXERCISE_NAME_MAP["movilidad dinámica global"]).toBeUndefined()
  })
})

// ── EXERCISE_NAME_MAP ─────────────────────────────────────────────────────────

describe("EXERCISE_NAME_MAP", () => {
  it("contiene mapping para sentadilla", () => {
    expect(EXERCISE_NAME_MAP["sentadilla"]).toBeDefined()
    expect(EXERCISE_NAME_MAP["sentadilla"].length).toBeGreaterThan(0)
  })

  it("contiene mapping para press de banca", () => {
    expect(EXERCISE_NAME_MAP["press de banca"]).toBeDefined()
  })

  it("no tiene mapping para nombre inventado", () => {
    expect(EXERCISE_NAME_MAP["ejercicio_inexistente_xyz"]).toBeUndefined()
  })

  it("todos los candidatos son strings no vacíos", () => {
    for (const [, candidates] of Object.entries(EXERCISE_NAME_MAP)) {
      for (const c of candidates) {
        expect(typeof c).toBe("string")
        expect(c.length).toBeGreaterThan(0)
      }
    }
  })
})

// ── resolveExerciseName (con mock de Supabase) ────────────────────────────────

function makeMockSupabase(resolvedId: string | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: resolvedId ? { id: resolvedId } : null,
    error: null,
  })
  const limit = vi.fn(() => ({ maybeSingle }))
  const eq = vi.fn(() => ({ limit }))
  const ilike = vi.fn(() => ({ eq }))
  const select = vi.fn(() => ({ ilike }))
  const from = vi.fn(() => ({ select }))

  return { from, _select: select, _ilike: ilike, _eq: eq, _limit: limit, _maybeSingle: maybeSingle }
}

describe("resolveExerciseName", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("devuelve null para nombre sin mapping", async () => {
    const mock = makeMockSupabase("some-uuid")
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const result = await resolveExerciseName(mock as unknown as Parameters<typeof resolveExerciseName>[0], "ejercicio_sin_mapping_xyz")
    expect(result).toBeNull()
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("devuelve el UUID cuando el primer candidato está en DB", async () => {
    const uuid = "abc-123"
    const mock = makeMockSupabase(uuid)
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const result = await resolveExerciseName(mock as unknown as Parameters<typeof resolveExerciseName>[0], "sentadilla")
    expect(result).toBe(uuid)
    expect(mock.from).toHaveBeenCalledWith("exercises")
  })

  it("devuelve null cuando DB no encuentra ningún candidato", async () => {
    const mock = makeMockSupabase(null)
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const result = await resolveExerciseName(mock as unknown as Parameters<typeof resolveExerciseName>[0], "sentadilla")
    expect(result).toBeNull()
  })

  it("es case-insensitive en el nombre del template", async () => {
    const uuid = "uuid-456"
    const mock = makeMockSupabase(uuid)
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const result = await resolveExerciseName(mock as unknown as Parameters<typeof resolveExerciseName>[0], "SENTADILLA")
    expect(result).toBe(uuid)
  })
})

// ── resolveExerciseNames ──────────────────────────────────────────────────────

describe("resolveExerciseNames", () => {
  it("separa resueltos de no resueltos", async () => {
    const uuidSentadilla = "uuid-squat"
    let callCount = 0
    const maybeSingle = vi.fn().mockImplementation(async () => {
      callCount++
      // Solo retorna resultado para el primer ejercicio (sentadilla)
      return callCount === 1
        ? { data: { id: uuidSentadilla }, error: null }
        : { data: null, error: null }
    })
    const limit = vi.fn(() => ({ maybeSingle }))
    const eq = vi.fn(() => ({ limit }))
    const ilike = vi.fn(() => ({ eq }))
    const select = vi.fn(() => ({ ilike }))
    const from = vi.fn(() => ({ select }))
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const mock = { from } as unknown as Parameters<typeof resolveExerciseName>[0]

    const result = await resolveExerciseNames(mock, [
      "sentadilla",
      "ejercicio_sin_mapping_xyz",
    ])

    expect(result.resolved).toHaveLength(1)
    expect(result.resolved[0].exerciseId).toBe(uuidSentadilla)
    expect(result.resolved[0].templateName).toBe("sentadilla")

    expect(result.unresolved).toHaveLength(1)
    expect(result.unresolved[0].templateName).toBe("ejercicio_sin_mapping_xyz")
    expect(result.unresolved[0].reason).toBe("no_mapping")
  })

  it("marca como not_in_db cuando hay mapping pero no hay match en DB", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const limit = vi.fn(() => ({ maybeSingle }))
    const eq = vi.fn(() => ({ limit }))
    const ilike = vi.fn(() => ({ eq }))
    const select = vi.fn(() => ({ ilike }))
    const from = vi.fn(() => ({ select }))
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    const mock = { from } as unknown as Parameters<typeof resolveExerciseName>[0]

    const result = await resolveExerciseNames(mock, ["press de banca"])

    expect(result.resolved).toHaveLength(0)
    expect(result.unresolved).toHaveLength(1)
    expect(result.unresolved[0].reason).toBe("not_in_db")
    expect(result.unresolved[0].candidates).toBeDefined()
  })
})
