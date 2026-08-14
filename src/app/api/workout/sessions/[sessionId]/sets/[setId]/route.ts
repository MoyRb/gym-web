import { createClient } from "@/lib/supabase/server"
import { updateSet, SetUpdateSchema } from "@/lib/workouts/sessions/update-set"

export const runtime = "nodejs"

interface RouteContext {
  params: Promise<{ sessionId: string; setId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { setId } = await context.params

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
    await updateSet(setId, user.id, parsed.data)
    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error actualizando serie"
    const status =
      message === "No autorizado" ? 403
      : message.includes("no encontrada") ? 404
      : message.includes("no está en progreso") ? 409
      : 500
    return Response.json({ error: message }, { status })
  }
}
