import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { startWorkoutSession } from "@/lib/workouts/sessions/start-session"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"

export const runtime = "nodejs"

const StartSessionSchema = z.object({
  workout_plan_day_id: z.string().uuid(),
})

export async function POST(request: Request) {
  // 1. Authenticate user — user_id NEVER comes from the body
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 })
  }

  const parsed = StartSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Parámetros inválidos", details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // 3. Create session atomically via RPC
  try {
    const sessionId = await startWorkoutSession(user.id, parsed.data.workout_plan_day_id)

    void trackServerEvent({
      name: EVENTS.WORKOUT_STARTED,
      userId: user.id,
      workoutSessionId: sessionId,
      dedupeKey: `workout_started:${sessionId}`,
    })

    return Response.json({ sessionId }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error iniciando sesión"
    const status = message.includes("ya existe") ? 409 : 500
    return Response.json({ error: message }, { status })
  }
}
