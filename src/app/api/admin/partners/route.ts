import "server-only"
import { requireAdmin } from "@/lib/auth/guards"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Safe partner code: 2–20 uppercase alphanumeric characters */
const CODE_RE = /^[A-Z0-9]{2,20}$/

const CreatePartnerSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(100),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Código mínimo 2 caracteres")
    .max(20, "Código máximo 20 caracteres")
    .regex(/^[A-Za-z0-9]{2,20}$/, "Código solo puede contener letras y números"),
  monthly_commission_bps: z.number().int().min(0).max(10000).default(5000),
  long_term_commission_bps: z.number().int().min(0).max(10000).default(1500),
})

/**
 * GET /api/admin/partners
 * Lists all gym partners. Admin-only.
 */
export async function GET(): Promise<Response> {
  await requireAdmin()

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("gym_partners")
    .select("id, name, code, status, monthly_commission_bps, long_term_commission_bps, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[GET /api/admin/partners] DB error:", error.code)
    return Response.json({ error: "Error interno." }, { status: 500 })
  }

  return Response.json({ partners: data ?? [] })
}

/**
 * POST /api/admin/partners
 * Creates a new gym partner. Admin-only.
 * Body: { name, code, monthly_commission_bps?, long_term_commission_bps? }
 */
export async function POST(request: Request): Promise<Response> {
  await requireAdmin()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Request inválido." }, { status: 400 })
  }

  const parsed = CreatePartnerSchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return Response.json({ error: "Validación fallida.", fields: fieldErrors }, { status: 422 })
  }

  const { name, code, monthly_commission_bps, long_term_commission_bps } = parsed.data
  const normalizedCode = code.toUpperCase()

  // Verify code format after normalization
  if (!CODE_RE.test(normalizedCode)) {
    return Response.json(
      { error: "Código inválido. Solo letras mayúsculas y números, 2–20 caracteres." },
      { status: 422 },
    )
  }

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("gym_partners")
    .insert({
      name,
      code: normalizedCode,
      monthly_commission_bps,
      long_term_commission_bps,
      status: "active",
    })
    .select("id, name, code, status, monthly_commission_bps, long_term_commission_bps")
    .single()

  if (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "Ya existe un gimnasio con ese código." },
        { status: 409 },
      )
    }
    console.error("[POST /api/admin/partners] DB error:", error.code)
    return Response.json({ error: "Error interno." }, { status: 500 })
  }

  return Response.json({ partner: data }, { status: 201 })
}
