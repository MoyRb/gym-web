import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"

interface TrackServerEventInput {
  name: string
  userId: string | null
  workoutSessionId?: string | null
  workoutPlanId?: string | null
  exerciseId?: string | null
  metadata?: Record<string, unknown>
  dedupeKey?: string | null
}

/**
 * Fire-and-forget server-side event tracking.
 *
 * - Uses service_role client (bypasses RLS) so it works from API routes.
 * - Silently ignores duplicate dedupe_key (pg error 23505 = unique_violation).
 * - Never throws — analytics must never block or break the caller.
 * - user_id ALWAYS comes from the authenticated server session, never from
 *   client-supplied data.
 */
export async function trackServerEvent(input: TrackServerEventInput): Promise<void> {
  try {
    const service = createServiceRoleClient()
    const { error } = await service.from("analytics_events").insert({
      user_id: input.userId,
      event_type: input.name,
      occurred_at: new Date().toISOString(),
      workout_session_id: input.workoutSessionId ?? null,
      workout_plan_id: input.workoutPlanId ?? null,
      exercise_id: input.exerciseId ?? null,
      metadata: (input.metadata ?? {}) as Json,
      dedupe_key: input.dedupeKey ?? null,
    })

    if (error && error.code !== "23505") {
      // 23505 = unique_violation: duplicate dedupe_key — idempotent, expected
      if (process.env.NODE_ENV === "development") {
        console.error("[trackServerEvent]", error)
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[trackServerEvent exception]", err)
    }
  }
}
