import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const MeasurementSchema = z.object({
  measured_at:      z.string().datetime().optional(),
  weight_kg:        z.number().positive().nullable().optional(),
  body_fat_percent: z.number().min(1).max(80).nullable().optional(),
  waist_cm:         z.number().positive().nullable().optional(),
  chest_cm:         z.number().positive().nullable().optional(),
  arm_cm:           z.number().positive().nullable().optional(),
  thigh_cm:         z.number().positive().nullable().optional(),
  notes:            z.string().max(500).nullable().optional(),
})

export async function POST(request: Request) {
  // 1. Authenticate — user_id derived from session only
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

  const parsed = MeasurementSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Datos inválidos", details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  // At least one body measurement must be provided (exclude metadata fields from check)
  const { weight_kg, body_fat_percent, waist_cm, chest_cm, arm_cm, thigh_cm } = parsed.data
  const hasValue = [weight_kg, body_fat_percent, waist_cm, chest_cm, arm_cm, thigh_cm].some(
    (v) => v != null,
  )
  if (!hasValue) {
    return Response.json(
      { error: "Proporciona al menos una medición" },
      { status: 422 },
    )
  }

  // 3. Insert via service_role
  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("progress_measurements")
    .insert({
      user_id: user.id,
      measured_at: parsed.data.measured_at ?? new Date().toISOString(),
      ...parsed.data,
    })
    .select("id")
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ id: data.id }, { status: 201 })
}
