import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"

type SessionAction = "complete" | "cancel"

/**
 * Completes or cancels a workout session.
 * Validates ownership and that the session is in_progress.
 * Completion is idempotent if called twice (second call is a no-op).
 */
export async function completeSession(
  sessionId: string,
  userId: string,
  action: SessionAction,
): Promise<void> {
  const service = createServiceRoleClient()

  // 1. Verify ownership and current status
  const { data: session, error: lookupErr } = await service
    .from("workout_sessions")
    .select("id, user_id, status, started_at")
    .eq("id", sessionId)
    .maybeSingle()

  if (lookupErr || !session) {
    throw new Error("Sesión no encontrada")
  }
  if (session.user_id !== userId) {
    throw new Error("No autorizado")
  }
  if (session.status !== "in_progress") {
    // Idempotent: already completed or cancelled — no-op
    return
  }

  const now = new Date()
  const startedAt = new Date(session.started_at)
  const durationSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000))

  const update =
    action === "complete"
      ? {
          status: "completed" as const,
          completed_at: now.toISOString(),
          duration_seconds: durationSeconds,
        }
      : {
          status: "cancelled" as const,
        }

  const { error: updateErr } = await service
    .from("workout_sessions")
    .update(update)
    .eq("id", sessionId)

  if (updateErr) {
    throw new Error(`Error actualizando sesión: ${updateErr.message}`)
  }
}
