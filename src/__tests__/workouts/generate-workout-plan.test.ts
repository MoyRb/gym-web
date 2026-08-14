/**
 * generate-workout-plan.test.ts
 *
 * Tests unitarios para el generador de planes de entrenamiento.
 * Mockea Supabase client, findTemplateForProfile y resolveExerciseName.
 * No accede a la base de datos.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { UserProfile } from "@/types"

// ── Mocks (vi.hoisted para que se resuelvan antes de los imports) ─────────────

const { mockRpc, mockFindTemplate, mockResolveExercise } = vi.hoisted(() => {
  const mockRpc = vi.fn()
  const mockFindTemplate = vi.fn()
  const mockResolveExercise = vi.fn()
  return { mockRpc, mockFindTemplate, mockResolveExercise }
})

vi.mock("@/lib/routine-catalog", () => ({
  findTemplateForProfile: mockFindTemplate,
}))

vi.mock("@/lib/workouts/exercise-resolver", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/workouts/exercise-resolver")>()
  return {
    ...orig,
    resolveExerciseName: mockResolveExercise,
  }
})

import { generateWorkoutPlan } from "@/lib/workouts/generate-workout-plan"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROFILE: Pick<UserProfile, "objetivo" | "experiencia" | "dias_por_semana"> = {
  objetivo: "ganar_masa_muscular",
  experiencia: "principiante",
  dias_por_semana: 3,
}

const BASE_TEMPLATE = {
  id: "tpl-1",
  title: "Full Body 3 días",
  slug: "fullbody-3d",
  goal: "ganar_masa_muscular",
  experience: "principiante",
  days_per_week: 3,
  short_description: "Rutina base",
  duration_weeks: 8,
  estimated_session_minutes: 60,
  level_label: "Principiante",
  focus_areas: ["hipertrofia"],
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  routine_data: {
    dias: [
      {
        dia: "dia_1",
        nombre_dia: "Día 1 · Full Body A",
        enfoque: "Cuerpo completo",
        ejercicios: [
          { nombre: "Sentadilla", series: 3, repeticiones: "6-10 rep", descanso: "90-120 s" },
          { nombre: "Press de banca", series: 3, repeticiones: "8-10 rep", descanso: "90 s" },
        ],
      },
      {
        dia: "dia_2",
        nombre_dia: "Día 2 · Full Body B",
        enfoque: "Torso mixto",
        ejercicios: [
          { nombre: "Jalón al pecho", series: 3, repeticiones: "10-12 rep", descanso: "75 s" },
        ],
      },
      {
        dia: "dia_3",
        nombre_dia: "Día 3 · Pierna",
        enfoque: "Pierna",
        ejercicios: [
          { nombre: "Prensa", series: 3, repeticiones: "10-12 rep", descanso: "90 s" },
          { nombre: "Plancha frontal", series: 3, repeticiones: "30-45 s", descanso: "45 s" },
        ],
      },
    ],
  },
}

function makeSupabaseMock(planId = "plan-uuid-001") {
  mockRpc.mockResolvedValue({ data: planId, error: null })
  return { rpc: mockRpc } as unknown as Parameters<typeof generateWorkoutPlan>[0]
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe("generateWorkoutPlan", () => {
  it("lanza error si no hay template para el perfil", async () => {
    mockFindTemplate.mockResolvedValue(null)
    const supabase = makeSupabaseMock()
    await expect(generateWorkoutPlan(supabase, "user-1", PROFILE)).rejects.toThrow(
      "No hay plantillas",
    )
  })

  it("retorna el planId devuelto por el RPC", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("exercise-uuid-1")
    const supabase = makeSupabaseMock("plan-new-001")

    const result = await generateWorkoutPlan(supabase, "user-1", PROFILE)
    expect(result.planId).toBe("plan-new-001")
  })

  it("llama al RPC con p_user_id correcto", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-abc", PROFILE)

    expect(mockRpc).toHaveBeenCalledWith(
      "create_workout_plan",
      expect.objectContaining({ p_user_id: "user-abc" }),
    )
  })

  it("llama al RPC con p_source = 'template'", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    expect(mockRpc).toHaveBeenCalledWith(
      "create_workout_plan",
      expect.objectContaining({ p_source: "template" }),
    )
  })

  it("pasa los días en el orden correcto (sort_order ascendente)", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    const call = mockRpc.mock.calls[0][1] as { p_days: Array<{ day_number: number; sort_order: number }> }
    const days = call.p_days
    expect(days[0].day_number).toBe(1)
    expect(days[0].sort_order).toBe(1)
    expect(days[1].day_number).toBe(2)
    expect(days[2].day_number).toBe(3)
  })

  it("pasa los ejercicios con sort_order correcto dentro de cada día", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    const call = mockRpc.mock.calls[0][1] as { p_days: Array<{ exercises: Array<{ sort_order: number }> }> }
    const day1Exercises = call.p_days[0].exercises
    expect(day1Exercises[0].sort_order).toBe(1)
    expect(day1Exercises[1].sort_order).toBe(2)
  })

  it("pasa sets y reps correctamente (6-10 rep → min=6 max=10)", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    const call = mockRpc.mock.calls[0][1] as {
      p_days: Array<{ exercises: Array<{ sets: number; reps_min: number; reps_max: number }> }>
    }
    const firstEx = call.p_days[0].exercises[0]
    expect(firstEx.sets).toBe(3)
    expect(firstEx.reps_min).toBe(6)
    expect(firstEx.reps_max).toBe(10)
  })

  it("parsea ejercicio por tiempo (30-45 s → duration_seconds=30)", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    const call = mockRpc.mock.calls[0][1] as {
      p_days: Array<{ exercises: Array<{ duration_seconds: number | null; reps_min: number | null }> }>
    }
    // día 3, ejercicio 2 = plancha frontal con "30-45 s"
    const plankEx = call.p_days[2].exercises[1]
    expect(plankEx.duration_seconds).toBe(30)
    expect(plankEx.reps_min).toBeNull()
  })

  it("parsea descanso con rango (90-120 s → rest_seconds=105)", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    const call = mockRpc.mock.calls[0][1] as {
      p_days: Array<{ exercises: Array<{ rest_seconds: number }> }>
    }
    // día 1, ejercicio 1 = sentadilla con "90-120 s"
    const squat = call.p_days[0].exercises[0]
    expect(squat.rest_seconds).toBe(105)
  })

  it("omite ejercicios no resueltos y los registra en unresolvedExercises", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    // Solo resuelve el segundo ejercicio del día 1
    mockResolveExercise
      .mockResolvedValueOnce(null)       // sentadilla → no resuelto
      .mockResolvedValue("ex-uuid")      // resto → resueltos

    const supabase = makeSupabaseMock()
    const result = await generateWorkoutPlan(supabase, "user-1", PROFILE)

    expect(result.unresolvedExercises).toHaveLength(1)
    expect(result.unresolvedExercises[0].exerciseName).toBe("Sentadilla")
    expect(result.unresolvedExercises[0].dayName).toBe("Día 1 · Full Body A")
    expect(result.unresolvedExercises[0].reason).toBe("not_in_db")
  })

  it("detecta días vacíos y los reporta en emptyDays", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    // Todos los ejercicios del día 2 no resuelven
    let callCount = 0
    mockResolveExercise.mockImplementation(async () => {
      callCount++
      // día 1: 2 ejercicios resueltos, día 2: 1 ejercicio sin resolver, día 3: 2 resueltos
      if (callCount === 3) return null // día 2, único ejercicio → día vacío
      return "ex-uuid"
    })

    const supabase = makeSupabaseMock()
    const result = await generateWorkoutPlan(supabase, "user-1", PROFILE)

    expect(result.emptyDays).toHaveLength(1)
    expect(result.emptyDays[0].dayNumber).toBe(2)
    expect(result.emptyDays[0].dayName).toBe("Día 2 · Full Body B")
  })

  it("retorna emptyDays vacío cuando todos los ejercicios resuelven", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()
    const result = await generateWorkoutPlan(supabase, "user-1", PROFILE)
    expect(result.emptyDays).toHaveLength(0)
  })

  it("cuenta correctamente los ejercicios resueltos", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid") // todos resueltos
    const supabase = makeSupabaseMock()

    const result = await generateWorkoutPlan(supabase, "user-1", PROFILE)
    // Template tiene 2+1+2 = 5 ejercicios
    expect(result.resolvedExercises).toBe(5)
  })

  it("lanza error si el RPC falla", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    mockRpc.mockResolvedValue({ data: null, error: { message: "violación de constraint" } })
    const supabase = { rpc: mockRpc } as unknown as Parameters<typeof generateWorkoutPlan>[0]

    await expect(generateWorkoutPlan(supabase, "user-1", PROFILE)).rejects.toThrow(
      "Error creando el plan",
    )
  })

  it("lanza error si el template no tiene días", async () => {
    mockFindTemplate.mockResolvedValue({
      ...BASE_TEMPLATE,
      routine_data: { dias: [] },
    })
    const supabase = makeSupabaseMock()
    await expect(generateWorkoutPlan(supabase, "user-1", PROFILE)).rejects.toThrow(
      "no tiene días configurados",
    )
  })

  it("usa el nombre del template como nombre del plan", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    expect(mockRpc).toHaveBeenCalledWith(
      "create_workout_plan",
      expect.objectContaining({ p_name: "Full Body 3 días" }),
    )
  })

  it("usa el goal y experience del template", async () => {
    mockFindTemplate.mockResolvedValue(BASE_TEMPLATE)
    mockResolveExercise.mockResolvedValue("ex-uuid")
    const supabase = makeSupabaseMock()

    await generateWorkoutPlan(supabase, "user-1", PROFILE)

    expect(mockRpc).toHaveBeenCalledWith(
      "create_workout_plan",
      expect.objectContaining({
        p_goal: "ganar_masa_muscular",
        p_experience: "principiante",
        p_days_per_week: 3,
      }),
    )
  })
})
