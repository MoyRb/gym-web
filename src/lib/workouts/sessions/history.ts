import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type { WorkoutHistoryEntry } from "@/types/database"

/**
 * Returns paginated workout session history for a user (completed only, newest first).
 */
export async function getSessionHistory(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<WorkoutHistoryEntry[]> {
  const service = createServiceRoleClient()

  const { data: sessions, error } = await service
    .from("workout_sessions")
    .select(`
      id, started_at, completed_at, duration_seconds, status,
      workout_plan_days ( name )
    `)
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !sessions) return []

  const sessionIds = sessions.map((s) => s.id)

  // Fetch set aggregates for all sessions in one query
  const { data: setAggs } = await service
    .from("workout_sets")
    .select(`
      workout_session_exercise_id,
      completed,
      weight_kg,
      reps,
      workout_session_exercises!inner ( workout_session_id )
    `)
    .in(
      "workout_session_exercises.workout_session_id",
      sessionIds.length > 0 ? sessionIds : ["__none__"],
    )

  // Aggregate per session
  const statsMap = new Map<
    string,
    { total: number; completed: number; volume: number }
  >()

  for (const row of setAggs ?? []) {
    const raw = row as unknown as {
      completed: boolean
      weight_kg: number | null
      reps: number | null
      workout_session_exercises: { workout_session_id: string }
    }
    const sid = raw.workout_session_exercises.workout_session_id
    const stat = statsMap.get(sid) ?? { total: 0, completed: 0, volume: 0 }
    stat.total++
    if (raw.completed) {
      stat.completed++
      if (raw.weight_kg != null && raw.reps != null) {
        stat.volume += raw.weight_kg * raw.reps
      }
    }
    statsMap.set(sid, stat)
  }

  return sessions.map((s) => {
    const raw = s as unknown as {
      id: string
      started_at: string
      completed_at: string | null
      duration_seconds: number | null
      status: string
      workout_plan_days: { name: string } | null
    }
    const stats = statsMap.get(raw.id) ?? { total: 0, completed: 0, volume: 0 }
    return {
      id: raw.id,
      started_at: raw.started_at,
      completed_at: raw.completed_at,
      duration_seconds: raw.duration_seconds,
      status: raw.status,
      plan_day_name: raw.workout_plan_days?.name ?? null,
      total_sets: stats.total,
      completed_sets: stats.completed,
      total_volume_kg: Math.round(stats.volume * 10) / 10,
    }
  })
}

/**
 * Returns a single session (completed) for display in the history detail view.
 */
export async function getHistorySession(
  sessionId: string,
  userId: string,
) {
  const service = createServiceRoleClient()

  const { data, error } = await service
    .from("workout_sessions")
    .select(`
      id, user_id, started_at, completed_at, duration_seconds, status, notes,
      workout_plan_days ( name, description ),
      workout_session_exercises (
        id, sort_order, exercise_id, target_sets, target_reps_min, target_reps_max,
        target_duration_seconds, target_rest_seconds, notes,
        exercises ( id, name, body_part, target, muscle_group ),
        workout_sets (
          id, set_number, set_type, weight_kg, reps, duration_seconds, rir, rpe,
          completed, completed_at, notes
        )
      )
    `)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null
  return data
}
