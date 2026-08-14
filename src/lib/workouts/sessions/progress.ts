import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"

export interface WeeklyStats {
  sessionsCompleted: number
  totalDurationSeconds: number
  totalSetsCompleted: number
  totalVolumeKg: number
  totalReps: number
}

export interface ExerciseProgress {
  exercise_id: string
  exercise_name: string
  session_count: number
  best_weight_kg: number | null
  last_weight_kg: number | null
  last_reps: number | null
  last_session_at: string
}

/**
 * Aggregated stats for the last 7 days.
 */
export async function getWeeklyStats(userId: string): Promise<WeeklyStats> {
  const service = createServiceRoleClient()
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: sessions } = await service
    .from("workout_sessions")
    .select("id, duration_seconds")
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("started_at", since)

  if (!sessions || sessions.length === 0) {
    return { sessionsCompleted: 0, totalDurationSeconds: 0, totalSetsCompleted: 0, totalVolumeKg: 0, totalReps: 0 }
  }

  const sessionIds = sessions.map((s) => s.id)
  const totalDurationSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0)

  const { data: sets } = await service
    .from("workout_sets")
    .select(`
      completed, weight_kg, reps,
      workout_session_exercises!inner ( workout_session_id )
    `)
    .eq("completed", true)
    .in("workout_session_exercises.workout_session_id", sessionIds)

  let totalSetsCompleted = 0
  let totalVolumeKg = 0
  let totalReps = 0

  for (const row of sets ?? []) {
    const r = row as unknown as { completed: boolean; weight_kg: number | null; reps: number | null }
    totalSetsCompleted++
    if (r.weight_kg != null && r.reps != null) {
      totalVolumeKg += r.weight_kg * r.reps
    }
    if (r.reps != null) totalReps += r.reps
  }

  return {
    sessionsCompleted: sessions.length,
    totalDurationSeconds,
    totalSetsCompleted,
    totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
    totalReps,
  }
}

/**
 * Top exercises by frequency, with last and best weights.
 */
export async function getExerciseProgress(
  userId: string,
  limit = 10,
): Promise<ExerciseProgress[]> {
  const service = createServiceRoleClient()

  // Get exercises from user's completed sessions
  const { data } = await service
    .from("workout_session_exercises")
    .select(`
      exercise_id,
      exercises ( name ),
      workout_sessions!inner ( user_id, status, completed_at ),
      workout_sets ( weight_kg, reps, completed )
    `)
    .eq("workout_sessions.user_id", userId)
    .eq("workout_sessions.status", "completed")
    .order("workout_sessions.completed_at", { ascending: false })

  if (!data) return []

  const exerciseMap = new Map<
    string,
    {
      name: string
      sessions: Set<string>
      bestWeight: number | null
      lastWeight: number | null
      lastReps: number | null
      lastAt: string
    }
  >()

  for (const row of data) {
    const r = row as unknown as {
      exercise_id: string
      exercises: { name: string }
      workout_sessions: { user_id: string; status: string; completed_at: string | null }
      workout_sets: Array<{ weight_kg: number | null; reps: number | null; completed: boolean }>
    }

    const eid = r.exercise_id
    const sessionAt = r.workout_sessions.completed_at ?? ""

    if (!exerciseMap.has(eid)) {
      exerciseMap.set(eid, {
        name: r.exercises.name,
        sessions: new Set(),
        bestWeight: null,
        lastWeight: null,
        lastReps: null,
        lastAt: sessionAt,
      })
    }

    const entry = exerciseMap.get(eid)!
    entry.sessions.add(sessionAt + eid)

    for (const s of r.workout_sets ?? []) {
      if (!s.completed) continue
      if (s.weight_kg != null) {
        if (entry.bestWeight == null || s.weight_kg > entry.bestWeight) {
          entry.bestWeight = s.weight_kg
        }
        // Track last session weight (first occurrence since data is ordered by date desc)
        if (entry.lastWeight == null && sessionAt === entry.lastAt) {
          entry.lastWeight = s.weight_kg
          entry.lastReps = s.reps
        }
      }
    }
  }

  return Array.from(exerciseMap.entries())
    .sort((a, b) => b[1].sessions.size - a[1].sessions.size)
    .slice(0, limit)
    .map(([exercise_id, e]) => ({
      exercise_id,
      exercise_name: e.name,
      session_count: e.sessions.size,
      best_weight_kg: e.bestWeight,
      last_weight_kg: e.lastWeight,
      last_reps: e.lastReps,
      last_session_at: e.lastAt,
    }))
}
