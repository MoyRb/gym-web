/**
 * POST /api/workout/plans/manual
 *
 * Creates a manual workout plan using the existing create_workout_plan RPC.
 * The RPC is atomic: archives the previous active plan and creates the new one.
 *
 * Request body:
 * {
 *   name: string                      // plan name (required, non-empty)
 *   goal: string                      // one of the valid goal values
 *   experience: string                // principiante | intermedio | avanzado
 *   days: Array<{
 *     name: string
 *     exercises: Array<{
 *       exercise_id: string
 *       sets: number
 *       reps_min: number | null
 *       reps_max: number | null
 *       duration_seconds: number | null
 *       rest_seconds: number
 *       rir: number | null
 *       notes: string | null
 *     }>
 *   }>
 * }
 *
 * Response: { planId: string }
 *
 * Security:
 * - userId from authenticated session only (never from body)
 * - exercise_id presence validated against public.exercises
 * - All DB writes via service_role via existing RPC
 */

import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"

export const runtime = "nodejs"

const VALID_GOALS = [
  "ganar_masa_muscular",
  "bajar_grasa",
  "mejorar_resistencia",
  "mejorar_condicion_general",
] as const

const VALID_EXPERIENCE = ["principiante", "intermedio", "avanzado"] as const

interface ExerciseInput {
  exercise_id: string
  sets: number
  reps_min: number | null
  reps_max: number | null
  duration_seconds: number | null
  rest_seconds: number
  rir: number | null
  notes: string | null
}

interface DayInput {
  name: string
  exercises: ExerciseInput[]
}

interface RequestBody {
  name: string
  goal: string
  experience: string
  days: DayInput[]
}

export async function POST(request: Request) {
  // 1. Authenticate
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Parse body
  let body: RequestBody
  try {
    body = (await request.json()) as RequestBody
  } catch {
    return Response.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 })
  }

  // 3. Validate
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "El nombre del plan es obligatorio" }, { status: 422 })
  }
  if (!VALID_GOALS.includes(body.goal as (typeof VALID_GOALS)[number])) {
    return Response.json({ error: "Objetivo inválido" }, { status: 422 })
  }
  if (!VALID_EXPERIENCE.includes(body.experience as (typeof VALID_EXPERIENCE)[number])) {
    return Response.json({ error: "Nivel de experiencia inválido" }, { status: 422 })
  }
  if (!Array.isArray(body.days) || body.days.length === 0) {
    return Response.json({ error: "El plan debe tener al menos un día" }, { status: 422 })
  }
  if (body.days.length > 7) {
    return Response.json({ error: "El plan no puede tener más de 7 días" }, { status: 422 })
  }

  for (const [di, day] of body.days.entries()) {
    if (!day.name || typeof day.name !== "string" || !day.name.trim()) {
      return Response.json(
        { error: `El día ${di + 1} debe tener nombre` },
        { status: 422 },
      )
    }
    if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
      return Response.json(
        { error: `El día "${day.name}" debe tener al menos un ejercicio` },
        { status: 422 },
      )
    }
    for (const ex of day.exercises) {
      if (!ex.exercise_id || typeof ex.exercise_id !== "string") {
        return Response.json({ error: "exercise_id inválido" }, { status: 422 })
      }
      if (!Number.isInteger(ex.sets) || ex.sets < 1) {
        return Response.json({ error: "series debe ser >= 1" }, { status: 422 })
      }
      if (!Number.isInteger(ex.rest_seconds) || ex.rest_seconds < 0) {
        return Response.json({ error: "rest_seconds debe ser >= 0" }, { status: 422 })
      }
    }
  }

  const serviceClient = createServiceRoleClient()

  // 4. Validate exercise IDs against the catalog (prevent injection of unknown IDs)
  const allExerciseIds = [...new Set(body.days.flatMap((d) => d.exercises.map((e) => e.exercise_id)))]
  const { data: foundExercises, error: exError } = await serviceClient
    .from("exercises")
    .select("id")
    .in("id", allExerciseIds)
    .eq("is_active", true)

  if (exError) {
    return Response.json({ error: "Error validando ejercicios" }, { status: 500 })
  }

  const foundIds = new Set((foundExercises ?? []).map((e) => e.id))
  const invalidId = allExerciseIds.find((id) => !foundIds.has(id))
  if (invalidId) {
    return Response.json(
      { error: "Uno o más ejercicios no existen en el catálogo" },
      { status: 422 },
    )
  }

  // 5. Build the p_days JSON for the RPC
  const rpcDays = body.days.map((day, idx) => ({
    day_number: idx + 1,
    name: day.name.trim(),
    description: null,
    sort_order: idx + 1,
    exercises: day.exercises.map((ex, ei) => ({
      exercise_id: ex.exercise_id,
      sort_order: ei + 1,
      sets: ex.sets,
      reps_min: ex.reps_min ?? null,
      reps_max: ex.reps_max ?? null,
      duration_seconds: ex.duration_seconds ?? null,
      rest_seconds: ex.rest_seconds,
      rir: ex.rir ?? null,
      notes: ex.notes?.trim() || null,
    })),
  }))

  // 6. Call create_workout_plan RPC (atomic: archives previous, creates new active)
  const { data: planId, error: rpcError } = await serviceClient.rpc("create_workout_plan", {
    p_user_id: user.id,
    p_name: body.name.trim(),
    p_goal: body.goal,
    p_experience: body.experience,
    p_days_per_week: body.days.length,
    p_source: "manual",
    p_days: rpcDays,
  })

  if (rpcError || !planId) {
    return Response.json(
      { error: "Error guardando el plan. Intenta de nuevo." },
      { status: 500 },
    )
  }

  // 7. Track (fire and forget)
  void trackServerEvent({
    name: EVENTS.MANUAL_PLAN_CREATED,
    userId: user.id,
    workoutPlanId: planId as string,
    metadata: {
      days_count: body.days.length,
      total_exercises: body.days.reduce((sum, d) => sum + d.exercises.length, 0),
    },
  })

  return Response.json({ planId })
}
