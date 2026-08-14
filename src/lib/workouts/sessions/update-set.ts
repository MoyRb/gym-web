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
 * Validates ownership: the set must belong to an in_progress session owned by userId.
 */
export async function updateSet(
  setId: string,
  userId: string,
  payload: SetUpdatePayload,
): Promise<void> {
  const service = createServiceRoleClient()

  // 1. Verify ownership and session status
  const { data: existing, error: lookupErr } = await service
    .from("workout_sets")
    .select(`
      id,
      workout_session_exercise_id,
      workout_session_exercises!inner (
        workout_session_id,
        workout_sessions!inner ( user_id, status )
      )
    `)
    .eq("id", setId)
    .maybeSingle()

  if (lookupErr || !existing) {
    throw new Error("Serie no encontrada")
  }

  const raw = existing as unknown as {
    workout_session_exercises: {
      workout_session_id: string
      workout_sessions: { user_id: string; status: string }
    }
  }

  const session = raw.workout_session_exercises.workout_sessions
  if (session.user_id !== userId) {
    throw new Error("No autorizado")
  }
  if (session.status !== "in_progress") {
    throw new Error("La sesión ya no está en progreso")
  }

  // 2. Build the update object
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
