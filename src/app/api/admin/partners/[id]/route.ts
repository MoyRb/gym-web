import "server-only"
import { requireAdmin } from "@/lib/auth/guards"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

const UpdatePartnerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]{2,20}$/)
    .optional(),
  status: z.enum(["active", "inactive"]).optional(),
  monthly_commission_bps: z.number().int().min(0).max(10000).optional(),
  long_term_commission_bps: z.number().int().min(0).max(10000).optional(),
})

/**
 * PATCH /api/admin/partners/[id]
 * Updates a gym partner. Admin-only.
 * Accepts any subset of: name, code, status, monthly_commission_bps, long_term_commission_bps
 */
export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  await requireAdmin()

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Request inválido." }, { status: 400 })
  }

  const parsed = UpdatePartnerSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Validación fallida.", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const updates = { ...parsed.data }
  if (updates.code) {
    updates.code = updates.code.toUpperCase()
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No hay campos para actualizar." }, { status: 400 })
  }

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("gym_partners")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, code, status, monthly_commission_bps, long_term_commission_bps, updated_at")
    .single()

  if (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "Ya existe un gimnasio con ese código." },
        { status: 409 },
      )
    }
    if (error.code === "PGRST116") {
      return Response.json({ error: "Gimnasio no encontrado." }, { status: 404 })
    }
    console.error("[PATCH /api/admin/partners/[id]] DB error:", error.code)
    return Response.json({ error: "Error interno." }, { status: 500 })
  }

  return Response.json({ partner: data })
}
