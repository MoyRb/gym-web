import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type { WorkoutSessionWithExercises } from "@/types/database"

/**
 * Fetches a full session (with exercises + sets) and validates ownership.
 * Returns null if not found or not owned by userId.
 */
export async function getSession(
  sessionId: string,
  userId: string,
): Promise<WorkoutSessionWithExercises | null> {
  const service = createServiceRoleClient()

  const { data, error } = await service
    .from("workout_sessions")
    .select(`
      id, user_id, workout_plan_id, workout_plan_day_id,
      status, started_at, completed_at, duration_seconds, notes,
      created_at, updated_at,
      workout_session_exercises (
        id, workout_session_id, workout_plan_exercise_id, exercise_id,
        sort_order, target_sets, target_reps_min, target_reps_max,
        target_duration_seconds, target_rest_seconds, notes,
        created_at, updated_at,
        exercises (
          id, name, body_part, equipment, target, muscle_group
        ),
        workout_sets (
          id, workout_session_exercise_id, set_number, set_type,
          weight_kg, reps, duration_seconds, rir, rpe,
          completed, completed_at, notes, created_at, updated_at
        )
      )
    `)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null

  const raw = data as unknown as {
    workout_session_exercises: Array<{
      exercises: WorkoutSessionWithExercises["exercises"][number]["exercise"]
      workout_sets: WorkoutSessionWithExercises["exercises"][number]["sets"]
      [key: string]: unknown
    }>
    [key: string]: unknown
  }

  const session: WorkoutSessionWithExercises = {
    ...(data as unknown as WorkoutSessionWithExercises),
    exercises: (raw.workout_session_exercises ?? [])
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map((ex) => ({
        ...(ex as unknown as WorkoutSessionWithExercises["exercises"][number]),
        exercise: ex.exercises,
        sets: (ex.workout_sets ?? []).sort(
          (a, b) => (a as { set_number: number }).set_number - (b as { set_number: number }).set_number,
        ),
      })),
  }

  return session
}
