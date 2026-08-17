/**
 * generate-workout-plan.ts
 *
 * Servicio server-side para generar un workout_plan desde un routine_template.
 *
 * Flujo:
 *   1. Buscar el template que mejor coincida con el perfil del usuario.
 *   2. Para cada ejercicio del template, resolver exercise_id vía exercise-resolver.
 *   3. Construir el payload de días y ejercicios.
 *   4. Llamar al RPC create_workout_plan (transaccional) para crear plan/días/ejercicios.
 *   5. Retornar el ID del nuevo plan.
 *
 * El RPC garantiza atomicidad:
 *   - Archiva el plan activo anterior.
 *   - Crea el nuevo plan como 'active'.
 *   - Incrementa el número de versión.
 *   - Falla completo si hay un error.
 *
 * NO implementa IA, ni sesiones, ni logs de ejercicio.
 */

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { UserProfile } from "@/types"
import { findTemplateForProfile } from "@/lib/routine-catalog"
import { KNOWN_UNMAPPABLE, normalizeTemplateName } from "./exercise-name-map"
import { resolveExerciseName, parseReps, parseRest } from "./exercise-resolver"

// ── Tipos internos ────────────────────────────────────────────────────────────

interface TemplateEjercicio {
  nombre: string
  series: number
  repeticiones: string
  descanso: string
  notas?: string
}

interface TemplateDia {
  dia: string
  nombre_dia: string
  enfoque?: string
  ejercicios: TemplateEjercicio[]
  notas?: string
}

interface ResolvedExercisePayload {
  exercise_id: string
  sort_order: number
  sets: number
  reps_min: number | null
  reps_max: number | null
  duration_seconds: number | null
  rest_seconds: number
  rir: number | null
  notes: string | null
}

interface ResolvedDayPayload {
  day_number: number
  name: string
  description: string | null
  sort_order: number
  exercises: ResolvedExercisePayload[]
}

export interface GeneratePlanResult {
  planId: string
  resolvedExercises: number
  unresolvedExercises: { dayName: string; exerciseName: string; reason: string }[]
  emptyDays: { dayName: string; dayNumber: number }[]
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Genera un workout_plan para el usuario desde su perfil.
 * Usa el template determinista existente como base.
 * Requiere cliente Supabase con service_role.
 */
export async function generateWorkoutPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  profile: Pick<UserProfile, "objetivo" | "experiencia" | "dias_por_semana">,
): Promise<GeneratePlanResult> {
  // 1. Encontrar el template más apropiado
  const template = await findTemplateForProfile(supabase, profile)
  if (!template) {
    throw new Error("No hay plantillas de rutina activas configuradas para este perfil")
  }

  const routineData = template.routine_data as { dias?: TemplateDia[] }
  const templateDias: TemplateDia[] = routineData.dias ?? []

  if (templateDias.length === 0) {
    throw new Error(`La plantilla "${template.title}" no tiene días configurados`)
  }

  // 2. Resolver ejercicios por día
  const resolvedDays: ResolvedDayPayload[] = []
  const unresolvedExercises: GeneratePlanResult["unresolvedExercises"] = []
  const emptyDays: GeneratePlanResult["emptyDays"] = []

  for (let dayIdx = 0; dayIdx < templateDias.length; dayIdx++) {
    const dia = templateDias[dayIdx]
    const resolvedExercises: ResolvedExercisePayload[] = []
    // Track sort_order independently of dayIdx so gaps from unresolved don't create holes
    let resolvedSortOrder = 0

    for (const ej of dia.ejercicios) {
      const key = normalizeTemplateName(ej.nombre)

      // Ejercicios conocidos como no mapeables (cardio, movilidad, circuitos compuestos)
      // Los registramos pero no contamos como error funcional
      if (KNOWN_UNMAPPABLE.has(key)) {
        unresolvedExercises.push({
          dayName: dia.nombre_dia,
          exerciseName: ej.nombre,
          reason: "known_unmappable",
        })
        continue
      }

      const exerciseId = await resolveExerciseName(supabase, ej.nombre)

      if (!exerciseId) {
        unresolvedExercises.push({
          dayName: dia.nombre_dia,
          exerciseName: ej.nombre,
          reason: "not_in_db",
        })
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[generateWorkoutPlan] Exercise not resolved: "${ej.nombre}" in "${dia.nombre_dia}"`)
        }
        continue
      }

      resolvedSortOrder++
      const { repsMin, repsMax, durationSeconds } = parseReps(ej.repeticiones)
      const restSeconds = parseRest(ej.descanso)

      resolvedExercises.push({
        exercise_id: exerciseId,
        sort_order: resolvedSortOrder,
        sets: ej.series,
        reps_min: repsMin,
        reps_max: repsMax,
        duration_seconds: durationSeconds,
        rest_seconds: restSeconds,
        rir: null,
        notes: ej.notas ?? null,
      })
    }

    // Detectar días vacíos EXPLÍCITAMENTE (fallo funcional visible)
    if (resolvedExercises.length === 0) {
      emptyDays.push({ dayName: dia.nombre_dia, dayNumber: dayIdx + 1 })
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[generateWorkoutPlan] EMPTY DAY: "${dia.nombre_dia}" (día ${dayIdx + 1}) tiene 0 ejercicios resueltos. Template: "${template.title}"`,
        )
      }
      // Incluir el día vacío en el plan — la UI mostrará el mensaje adecuado
      // NO omitirlo silenciosamente para preservar la estructura de días del template
    }

    resolvedDays.push({
      day_number: dayIdx + 1,
      name: dia.nombre_dia,
      description: dia.enfoque ?? null,
      sort_order: dayIdx + 1,
      exercises: resolvedExercises,
    })
  }

  const totalResolved = resolvedDays.reduce((sum, d) => sum + d.exercises.length, 0)

  // 3. Guard: never create a partial plan with empty days
  if (emptyDays.length > 0) {
    const names = emptyDays.map((d) => `"${d.dayName}"`).join(", ")
    throw new Error(
      `Template "${template.title}" produced days with no resolved exercises: ${names}. Cannot create partial plan.`,
    )
  }

  // 4. Llamar al RPC (transaccional: archiva plan anterior + crea nuevo)
  const { data: planId, error } = await supabase.rpc("create_workout_plan", {
    p_user_id: userId,
    p_name: template.title,
    p_goal: template.goal,
    p_experience: template.experience,
    p_days_per_week: template.days_per_week,
    p_source: "template",
    p_days: resolvedDays as unknown as Database["public"]["Functions"]["create_workout_plan"]["Args"]["p_days"],
  })

  if (error) {
    throw new Error(`Error creando el plan de entrenamiento: ${error.message}`)
  }

  if (!planId) {
    throw new Error("El RPC no devolvió el ID del plan creado")
  }

  return {
    planId: planId as string,
    resolvedExercises: totalResolved,
    unresolvedExercises,
    emptyDays,
  }
}
