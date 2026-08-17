/**
 * History Summary Builder
 *
 * Builds a compact, bounded history context for AI input.
 * Does NOT send full session data or all sets — only aggregate counts.
 * Non-blocking: returns null on any error or if no history exists.
 *
 * server-only.
 */

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { HistorySummary } from "@/lib/ai/types"

const MAX_RECENT_SESSIONS = 5
const MAX_RECENT_EXERCISE_IDS = 10
const RECENT_DAYS = 30

/**
 * Returns a compact training history summary for AI context.
 * Bounded to avoid large token usage.
 *
 * @returns null if no history or on error (never throws)
 */
export async function buildHistorySummary(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<HistorySummary | null> {
  try {
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: sessions } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(MAX_RECENT_SESSIONS)

    if (!sessions || sessions.length === 0) return null

    const sessionIds = sessions.map((s) => s.id)

    const { data: exercises } = await supabase
      .from("workout_session_exercises")
      .select("exercise_id")
      .in("workout_session_id", sessionIds)

    const uniqueIds = [...new Set((exercises ?? []).map((e) => e.exercise_id))]

    return {
      recent_sessions_count: sessions.length,
      recent_exercise_ids: uniqueIds.slice(0, MAX_RECENT_EXERCISE_IDS),
    }
  } catch {
    return null
  }
}
