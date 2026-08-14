import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"

/**
 * Creates a new workout session for the given day, copying all plan exercises
 * and creating sets with prefill from the user's previous sessions.
 *
 * Must be called server-side with a validated user_id from the authenticated session.
 * User ownership is validated inside the RPC.
 */
export async function startWorkoutSession(
  userId: string,
  workoutPlanDayId: string,
): Promise<string> {
  const service = createServiceRoleClient()

  const { data, error } = await service.rpc("start_workout_session", {
    p_user_id: userId,
    p_workout_plan_day_id: workoutPlanDayId,
  })

  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe una sesión en progreso para este día")
    }
    throw new Error(`Error iniciando sesión: ${error.message}`)
  }

  if (!data) {
    throw new Error("El RPC no devolvió un session_id")
  }

  return data as string
}
