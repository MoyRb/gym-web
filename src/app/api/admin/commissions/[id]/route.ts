import "server-only"
import { requireAdmin } from "@/lib/auth/guards"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { z } from "zod"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

type CommissionStatus = "pending" | "approved" | "paid" | "void"

/**
 * Allowed status transitions:
 *   pending  → approved ✓
 *   pending  → void     ✓
 *   approved → paid     ✓
 *   approved → void     ✓
 *   paid     → *        ✗ (no transition from paid — requires manual DB intervention)
 *   void     → *        ✗ (no transition from void)
 */
const ALLOWED_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
  pending: ["approved", "void"],
  approved: ["paid", "void"],
  paid: [],
  void: [],
}

const UpdateCommissionSchema = z.object({
  status: z.enum(["approved", "paid", "void"]),
})

/**
 * PATCH /api/admin/commissions/[id]
 * Updates a commission status. Admin-only.
 *
 * Only allowed transitions are accepted — paid commissions cannot be reverted
 * without a separate manual DB intervention (by design — prevents accidental
 * double-payment).
 *
 * Body: { status: "approved" | "paid" | "void" }
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

  const parsed = UpdateCommissionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Estado inválido.", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { status: newStatus } = parsed.data

  const service = createServiceRoleClient()

  // Fetch current status to validate transition
  const { data: current, error: fetchError } = await service
    .from("referral_commissions")
    .select("id, status")
    .eq("id", id)
    .single()

  if (fetchError || !current) {
    return Response.json({ error: "Comisión no encontrada." }, { status: 404 })
  }

  const currentStatus = current.status as CommissionStatus
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []

  if (!allowed.includes(newStatus)) {
    return Response.json(
      {
        error: `Transición no permitida: ${currentStatus} → ${newStatus}. Transiciones válidas desde ${currentStatus}: [${allowed.join(", ") || "ninguna"}]`,
      },
      { status: 422 },
    )
  }

  // Build timestamp fields
  const now = new Date().toISOString()
  const timestampUpdates: Record<string, string | null> = {}
  if (newStatus === "approved") timestampUpdates.approved_at = now
  if (newStatus === "paid") timestampUpdates.paid_at = now
  if (newStatus === "void") timestampUpdates.voided_at = now

  const { data, error } = await service
    .from("referral_commissions")
    .update({ status: newStatus, ...timestampUpdates })
    .eq("id", id)
    .select("id, status, approved_at, paid_at, voided_at")
    .single()

  if (error) {
    console.error("[PATCH /api/admin/commissions/[id]] DB error:", error.code)
    return Response.json({ error: "Error interno." }, { status: 500 })
  }

  return Response.json({ commission: data })
}
