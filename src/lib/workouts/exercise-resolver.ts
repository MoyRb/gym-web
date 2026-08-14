/**
 * exercise-resolver.ts
 *
 * Resuelve nombres de ejercicios de las plantillas (español) a UUIDs
 * de public.exercises (dataset hasaneyldrm, nombres en inglés).
 *
 * Estrategia determinista:
 *   1. Normalizar nombre del template → clave en EXERCISE_NAME_MAP.
 *   2. Para cada candidato en inglés → consulta exact case-insensitive contra DB.
 *   3. Devuelve el primer UUID encontrado.
 *   4. Si ninguno coincide → devuelve null (se omite el ejercicio, se registra).
 *
 * NO se usa fuzzy matching automático.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { EXERCISE_NAME_MAP, KNOWN_UNMAPPABLE, normalizeTemplateName } from "./exercise-name-map"

export interface ResolvedExercise {
  templateName: string
  exerciseId: string
}

export interface UnresolvedExercise {
  templateName: string
  reason: "no_mapping" | "not_in_db" | "known_unmappable"
  candidates?: readonly string[]
}

export interface ResolutionResult {
  resolved: ResolvedExercise[]
  unresolved: UnresolvedExercise[]
}

/**
 * Resuelve un único nombre de ejercicio a un UUID de la tabla exercises.
 * Devuelve null si no se puede resolver.
 */
export async function resolveExerciseName(
  supabase: SupabaseClient<Database>,
  templateName: string,
): Promise<string | null> {
  const key = normalizeTemplateName(templateName)
  const candidates = EXERCISE_NAME_MAP[key]

  if (!candidates || candidates.length === 0) {
    return null
  }

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id")
      .ilike("name", candidate)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[ExerciseResolver] Error consultando "${candidate}":`, error.message)
      }
      continue
    }

    if (data?.id) return data.id
  }

  return null
}

/**
 * Resuelve un array de nombres de ejercicios de forma secuencial.
 * Agrupa resultados en resolved / unresolved.
 */
export async function resolveExerciseNames(
  supabase: SupabaseClient<Database>,
  templateNames: string[],
): Promise<ResolutionResult> {
  const resolved: ResolvedExercise[] = []
  const unresolved: UnresolvedExercise[] = []

  for (const templateName of templateNames) {
    const key = normalizeTemplateName(templateName)

    // Ejercicios conocidos como no mapeables (cardio, movilidad, circuitos)
    if (KNOWN_UNMAPPABLE.has(key)) {
      unresolved.push({ templateName, reason: "known_unmappable" })
      continue
    }

    const candidates = EXERCISE_NAME_MAP[key]

    if (!candidates || candidates.length === 0) {
      unresolved.push({ templateName, reason: "no_mapping" })
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[ExerciseResolver] Sin mapping para: "${templateName}"`)
      }
      continue
    }

    const exerciseId = await resolveExerciseName(supabase, templateName)

    if (exerciseId) {
      resolved.push({ templateName, exerciseId })
    } else {
      unresolved.push({ templateName, reason: "not_in_db", candidates })
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[ExerciseResolver] No encontrado en DB: "${templateName}" (probados: ${candidates.join(", ")})`,
        )
      }
    }
  }

  return { resolved, unresolved }
}

// ── Parsers de strings de las plantillas ─────────────────────────────────────

/**
 * Parsea el string de repeticiones de una plantilla.
 * Ejemplos: "6-10 rep", "8 rep", "30-45 s", "10-12 rep por pierna"
 */
export function parseReps(repsStr: string): {
  repsMin: number | null
  repsMax: number | null
  durationSeconds: number | null
} {
  if (!repsStr) return { repsMin: null, repsMax: null, durationSeconds: null }

  const str = repsStr.trim().toLowerCase()

  // Ejercicio por tiempo: "30-45 s", "45 s"
  if (str.includes(" s") && !str.includes("rep")) {
    const m = str.match(/(\d+)(?:-(\d+))?/)
    if (m) {
      // Usar el valor mínimo del rango como duración
      return { repsMin: null, repsMax: null, durationSeconds: parseInt(m[1]) }
    }
  }

  // Ejercicio por repeticiones: "6-10 rep", "8-12 rep por pierna", etc.
  const m = str.match(/(\d+)(?:-(\d+))?/)
  if (m) {
    const min = parseInt(m[1])
    const max = m[2] ? parseInt(m[2]) : min
    return { repsMin: min, repsMax: max, durationSeconds: null }
  }

  return { repsMin: null, repsMax: null, durationSeconds: null }
}

/**
 * Parsea el string de descanso de una plantilla.
 * Ejemplos: "90 s", "90-120 s", "45-60 s", "120-150 s"
 * Devuelve segundos (promedio del rango si hay rango).
 */
export function parseRest(restStr: string): number {
  if (!restStr) return 60

  const m = restStr.trim().match(/(\d+)(?:-(\d+))?/)
  if (!m) return 60

  const min = parseInt(m[1])
  const max = m[2] ? parseInt(m[2]) : min
  return Math.round((min + max) / 2)
}
