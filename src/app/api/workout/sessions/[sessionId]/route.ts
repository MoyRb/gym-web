import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { completeSession } from "@/lib/workouts/sessions/complete-session"

export const runtime = "nodejs"

const SessionActionSchema = z.object({
  action: z.enum(["complete", "cancel"]),
})

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const { sessionId } = await context.params

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

  const parsed = SessionActionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Acción inválida" }, { status: 422 })
  }

  // 3. Apply action
  try {
    await completeSession(sessionId, user.id, parsed.data.action)
    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error actualizando sesión"
    const status = message === "No autorizado" ? 403 : 500
    return Response.json({ error: message }, { status })
  }
}
