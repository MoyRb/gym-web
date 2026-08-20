/**
 * POST /api/workout/generate-ai/[generationId]/finalize
 *
 * Validates the completed draft and atomically activates it.
 *
 * Steps:
 *   1. Authenticate — userId from session only.
 *   2. Load generation session; verify ownership and completion.
 *   3. Load draft plan with all days and exercises.
 *   4. Global validation:
 *      - Exact day count matches days_per_week
 *      - Consecutive day_numbers (1..N)
 *      - No empty days
 *      - No duplicate days
 *   5. Call finalize_ai_draft RPC (atomic: archives old active → activates draft).
 *   6. Mark session completed.
 *   7. Return { planId }.
 *
 * The previous active plan is archived ONLY within this step.
 * There is never a window with zero active plans.
 *
 * Response:
 *   { planId }
 */

import type { NextRequest } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import type { WorkoutSplit } from "@/lib/workouts/ai/workout-split"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"

export const runtime = "nodejs"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ generationId: string }> },
) {
  const { generationId } = await params

  // 1. Authenticate
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const serviceClient = createServiceRoleClient()

  // 2. Load session and verify ownership
  const { data: session, error: sessionError } = await serviceClient
    .from("ai_generation_sessions")
    .select("*")
    .eq("id", generationId)
    .maybeSingle()

  if (sessionError || !session) {
    return Response.json({ error: "Sesión de generación no encontrada" }, { status: 404 })
  }

  if (session.user_id !== user.id) {
    return Response.json({ error: "No autorizado" }, { status: 403 })
  }

  if (session.status !== "in_progress") {
    return Response.json(
      { error: `Sesión en estado inválido: ${session.status}` },
      { status: 409 },
    )
  }

  if (session.draft_plan_id == null) {
    return Response.json({ error: "La sesión no tiene plan borrador" }, { status: 409 })
  }

  // 3. Verify all batches completed
  if (session.completed_batches < session.total_batches) {
    return Response.json(
      {
        error: `La generación no está completa: ${session.completed_batches}/${session.total_batches} lotes procesados`,
      },
      { status: 409 },
    )
  }

  const draftPlanId: string = session.draft_plan_id
  const split = session.split_json as unknown as WorkoutSplit
  const expectedDayCount = split.length

  // 4. Load draft plan days (no exercises needed for structural validation)
  const { data: days, error: daysError } = await serviceClient
    .from("workout_plan_days")
    .select("id, day_number, name")
    .eq("workout_plan_id", draftPlanId)
    .order("day_number", { ascending: true })

  if (daysError) {
    return Response.json({ error: "Error cargando el plan borrador" }, { status: 500 })
  }

  // 5. Global validation
  const validationError = validateDraftStructure(days ?? [], expectedDayCount)
  if (validationError) {
    // Mark session failed — draft is structurally invalid
    await serviceClient
      .from("ai_generation_sessions")
      .update({
        status: "failed",
        error_message: validationError,
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId)

    return Response.json(
      { error: "El plan generado no pasó la validación final. La rutina anterior se mantiene activa." },
      { status: 422 },
    )
  }

  // 6. Atomic swap: archive old active plan → activate draft
  const { error: rpcError } = await serviceClient.rpc("finalize_ai_draft", {
    p_user_id: user.id,
    p_draft_plan_id: draftPlanId,
  })

  if (rpcError) {
    return Response.json(
      { error: "Error activando el plan. La rutina anterior se mantiene activa." },
      { status: 500 },
    )
  }

  // 7. Mark session completed
  await serviceClient
    .from("ai_generation_sessions")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", generationId)

  void trackServerEvent({
    name: EVENTS.AI_GENERATION_COMPLETED,
    userId: user.id,
    workoutPlanId: draftPlanId,
    metadata: { generation_id: generationId },
    dedupeKey: `ai_gen_completed:${generationId}`,
  })

  return Response.json({ planId: draftPlanId })
}

// ── Global Validation ─────────────────────────────────────────────────────────

type DayRow = { id: string; day_number: number; name: string }

function validateDraftStructure(
  days: DayRow[],
  expectedDayCount: number,
): string | null {
  // Exact count
  if (days.length !== expectedDayCount) {
    return `Expected ${expectedDayCount} days, got ${days.length}`
  }

  // No duplicates
  const dayNumbers = days.map((d) => d.day_number)
  if (new Set(dayNumbers).size !== dayNumbers.length) {
    return "Duplicate day_number found in draft plan"
  }

  // Consecutive 1..N
  const sorted = [...dayNumbers].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      return `day_numbers must be 1..${expectedDayCount}, got [${sorted.join(",")}]`
    }
  }

  return null
}
