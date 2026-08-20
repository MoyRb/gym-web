import "server-only"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/server"

export const SetUpdateSchema = z.object({
  weight_kg:        z.number().min(0).nullable().optional(),
  reps:             z.number().int().min(1).nullable().optional(),
  duration_seconds: z.number().int().min(1).nullable().optional(),
  rir:              z.number().int().min(0).max(10).nullable().optional(),
  rpe:              z.number().min(1).max(10).nullable().optional(),
  completed:        z.boolean().optional(),
  notes:            z.string().max(500).nullable().optional(),
})

export type SetUpdatePayload = z.infer<typeof SetUpdateSchema>

/**
 * Updates a single workout set.
 *
 * Validates ownership via explicit multi-step lookup (avoids fragile nested
 * PostgREST join that was masking real DB errors as 404s).
 *
 * Steps:
 *  1. Fetch workout_set by setId
 *  2. Fetch workout_session_exercise by the set's FK
 *  3. Validate workout_session_id === sessionId (URL-level integrity)
 *  4. Fetch workout_session
 *  5. Validate user_id === userId
 *  6. Validate status === "in_progress"
 *  7. Apply the update
 */
export async function updateSet(
  setId: string,
  sessionId: string,
  userId: string,
  payload: SetUpdatePayload,
): Promise<void> {
  const service = createServiceRoleClient()

  // ── Step 1: fetch the set ────────────────────────────────────────────────────
  const { data: workoutSet, error: setErr } = await service
    .from("workout_sets")
    .select("id, workout_session_exercise_id")
    .eq("id", setId)
    .maybeSingle()

  if (setErr) {
    console.error("[updateSet] DB error fetching workout_set", {
      code:    setErr.code,
      message: setErr.message,
      details: setErr.details,
      hint:    setErr.hint,
    })
    throw new Error("Error interno al buscar la serie")
  }
  if (!workoutSet) {
    throw new Error("Serie no encontrada")
  }

  // ── Step 2: fetch the session-exercise ──────────────────────────────────────
  const { data: wse, error: wseErr } = await service
    .from("workout_session_exercises")
    .select("workout_session_id")
    .eq("id", workoutSet.workout_session_exercise_id)
    .maybeSingle()

  if (wseErr) {
    console.error("[updateSet] DB error fetching workout_session_exercise", {
      code:    wseErr.code,
      message: wseErr.message,
      details: wseErr.details,
      hint:    wseErr.hint,
    })
    throw new Error("Error interno al verificar la serie")
  }
  if (!wse) {
    throw new Error("Serie no encontrada")
  }

  // ── Step 3: validate URL-level session integrity ─────────────────────────────
  if (wse.workout_session_id !== sessionId) {
    // The set exists but belongs to a different session — treat as not found
    throw new Error("Serie no encontrada")
  }

  // ── Step 4: fetch the session ────────────────────────────────────────────────
  const { data: session, error: sessionErr } = await service
    .from("workout_sessions")
    .select("user_id, status")
    .eq("id", sessionId)
    .maybeSingle()

  if (sessionErr) {
    console.error("[updateSet] DB error fetching workout_session", {
      code:    sessionErr.code,
      message: sessionErr.message,
      details: sessionErr.details,
      hint:    sessionErr.hint,
    })
    throw new Error("Error interno al verificar la sesión")
  }
  if (!session) {
    throw new Error("Serie no encontrada")
  }

  // ── Step 5: ownership ────────────────────────────────────────────────────────
  if (session.user_id !== userId) {
    throw new Error("No autorizado")
  }

  // ── Step 6: session must be active ──────────────────────────────────────────
  if (session.status !== "in_progress") {
    throw new Error("La sesión ya no está en progreso")
  }

  // ── Step 7: build and apply update ──────────────────────────────────────────
  const update: Record<string, unknown> = {}
  if (payload.weight_kg        !== undefined) update.weight_kg        = payload.weight_kg
  if (payload.reps             !== undefined) update.reps             = payload.reps
  if (payload.duration_seconds !== undefined) update.duration_seconds = payload.duration_seconds
  if (payload.rir              !== undefined) update.rir              = payload.rir
  if (payload.rpe              !== undefined) update.rpe              = payload.rpe
  if (payload.notes            !== undefined) update.notes            = payload.notes
  if (payload.completed        !== undefined) {
    update.completed    = payload.completed
    update.completed_at = payload.completed ? new Date().toISOString() : null
  }

  if (Object.keys(update).length === 0) return

  const { error: updateErr } = await service
    .from("workout_sets")
    .update(update)
    .eq("id", setId)

  if (updateErr) {
    throw new Error(`Error actualizando serie: ${updateErr.message}`)
  }
}
