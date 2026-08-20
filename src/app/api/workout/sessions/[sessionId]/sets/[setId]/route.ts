import { createClient } from "@/lib/supabase/server"
import { updateSet, SetUpdateSchema } from "@/lib/workouts/sessions/update-set"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ sessionId: string; setId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { sessionId, setId } = await context.params

  // 1. Authenticate
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

  const parsed = SetUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Payload inválido", details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // 3. Update set (validates ownership + session status internally)
  try {
    await updateSet(setId, sessionId, user.id, parsed.data)

    if (parsed.data.completed === true) {
      void trackServerEvent({
        name: EVENTS.SET_COMPLETED,
        userId: user.id,
        workoutSessionId: sessionId,
        metadata: { set_id: setId },
      })
    }

    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error actualizando serie"
    const status =
      message === "No autorizado"                ? 403
      : message.includes("no encontrada")        ? 404
      : message.includes("no está en progreso")  ? 409
      : message.startsWith("Error interno")      ? 500
      : 500
    return Response.json({ error: message }, { status })
  }
}
