/**
 * POST /api/workout/generate-ai/[generationId]/next
 *
 * Processes the next pending batch in an ongoing AI generation session.
 *
 * Steps:
 *   1. Authenticate — userId from session only.
 *   2. Load generation session; verify ownership.
 *   3. Determine next batch index from completed_batches.
 *   4. Reconstruct batch days and candidates server-side from stored split/candidates.
 *   5. Call AI provider for exercise selection (IDs only).
 *   6. Validate output (day numbers, candidate IDs).
 *   7. Prescribe exercises deterministically for selected IDs.
 *   8. Persist validated days to the draft plan.
 *   9. Increment completed_batches.
 *  10. Return updated state.
 *
 * Security:
 * - Ownership verified via session.user_id.
 * - All batch parameters (day numbers, candidates) derived server-side.
 * - Client sends nothing except the generationId in the URL.
 * - Only goal + experience sent to AI — no age, weight, height, or sex.
 *
 * Rate limit:
 * - On 429, returns 429 with retryAfterSeconds — client handles the wait.
 *
 * Response:
 *   { completedBatches, totalBatches, done, rateLimitInfo? }
 */

import type { NextRequest } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { buildBatches } from "@/lib/workouts/ai/workout-split"
import { getCandidatesForBatch, validateSelectionCandidateIds, validateBatchDayNumbers, validateBodyPartVariety } from "@/lib/workouts/ai/batch-candidates"
import { prescribeExercise, getExerciseCountBounds } from "@/lib/workouts/prescription/prescribe"
import { getWorkoutAIProvider } from "@/lib/ai/provider"
import { AIProviderError } from "@/lib/ai/types"
import type { ExerciseSelectionBatchInput, RateLimitInfo } from "@/lib/ai/types"
import type { GroqWorkoutProvider } from "@/lib/ai/providers/groq"
import type { WorkoutSplit, SplitDay } from "@/lib/workouts/ai/workout-split"
import type { CandidateExercise } from "@/lib/workouts/ai/candidate-exercises"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export const runtime = "nodejs"

type ServiceClient = SupabaseClient<Database>

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
    return Response.json({ error: "La sesión no tiene un plan borrador asociado" }, { status: 409 })
  }

  const completedBatches: number = session.completed_batches
  const totalBatches: number = session.total_batches

  if (completedBatches >= totalBatches) {
    // Already done — nothing to process
    return Response.json({ completedBatches, totalBatches, done: true, rateLimitInfo: null })
  }

  // 3. Reconstruct split and candidates from stored JSON
  const split = session.split_json as unknown as WorkoutSplit
  const allCandidates = session.candidates_json as unknown as CandidateExercise[]
  const batches = buildBatches(split)
  const currentBatch: SplitDay[] = batches[completedBatches]

  if (!currentBatch || currentBatch.length === 0) {
    return Response.json({ error: "Batch inválido" }, { status: 500 })
  }

  // 4. Get AI provider
  let provider: GroqWorkoutProvider
  try {
    provider = getWorkoutAIProvider() as GroqWorkoutProvider
    if (typeof provider.generateBatchSelection !== "function") {
      throw new Error("Provider does not support batch selection")
    }
  } catch (err) {
    if (err instanceof AIProviderError && err.code === "config") {
      return Response.json(
        { error: "El generador de IA no está disponible en este momento" },
        { status: 503 },
      )
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  // 5. Build history summary (non-blocking)
  const { buildHistorySummary } = await import("@/lib/workouts/ai/history-summary")
  const historySummary = await buildHistorySummary(serviceClient, user.id)

  // 6. Derive batch candidates and exercise count bounds
  const batchCandidates = getCandidatesForBatch(allCandidates, currentBatch)

  // 7. Load profile from DB — needed for goal/experience/environment
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("goal, experience, days_per_week, training_environment")
    .eq("id", user.id)
    .maybeSingle()

  if (!profileRow) {
    return Response.json({ error: "Error cargando el perfil" }, { status: 500 })
  }

  const goal = profileRow.goal ?? ""
  const experience = profileRow.experience ?? ""
  const daysPerWeek = profileRow.days_per_week ?? split.length
  const trainingEnvironment = (profileRow.training_environment as string) ?? null
  const { min: minEx, max: maxEx } = getExerciseCountBounds(daysPerWeek, experience)

  const selectionInput: ExerciseSelectionBatchInput = {
    profile: { goal, experience, training_environment: trainingEnvironment },
    batch_days: currentBatch.map((d) => ({ day_number: d.day_number, name: d.name })),
    candidates: batchCandidates,
    history_summary: historySummary,
    min_exercises_per_day: minEx,
    max_exercises_per_day: maxEx,
  }

  // 8. Call AI for exercise selection
  let rateLimitInfo: RateLimitInfo | null = null

  try {
    const selectionResult = await provider.generateBatchSelection(selectionInput)
    rateLimitInfo = selectionResult.rateLimitInfo

    // Validate day numbers
    const dayNumberError = validateBatchDayNumbers(
      selectionResult.output.days,
      currentBatch.map((d) => d.day_number),
    )
    if (dayNumberError) {
      throw new Error(`Batch ${completedBatches} day validation failed: ${dayNumberError}`)
    }

    // Validate candidate IDs
    const candidateMap = new Map(batchCandidates.map((c) => [c.id, c]))
    const candidateErrors = validateSelectionCandidateIds(selectionResult.output.days, batchCandidates)
    if (candidateErrors.length > 0) {
      throw new Error(
        `Batch ${completedBatches} returned invalid exercise_ids: ${candidateErrors.map((e) => e.exercise_id).join(", ")}`,
      )
    }

    // Validate body_part variety for broad-focus days
    const varietyError = validateBodyPartVariety(selectionResult.output.days, currentBatch, candidateMap)
    if (varietyError) {
      throw new Error(`Batch ${completedBatches} variety check failed: ${varietyError}`)
    }

    // Prescribe exercises for selected IDs
    const prescribedDays = selectionResult.output.days.map((selDay) => ({
      day_number: selDay.day_number,
      exercises: selDay.exercise_ids.slice(0, maxEx).map((exId) => {
        const meta = candidateMap.get(exId)!
        return prescribeExercise(exId, meta, goal, experience)
      }),
    }))

    // Persist batch days
    const persistError = await persistBatchDays(
      serviceClient,
      session.draft_plan_id,
      prescribedDays,
      split,
    )
    if (persistError) throw new Error(persistError)

    // Increment completed_batches
    const newCompleted = completedBatches + 1
    await serviceClient
      .from("ai_generation_sessions")
      .update({ completed_batches: newCompleted, updated_at: new Date().toISOString() })
      .eq("id", generationId)

    return Response.json({
      completedBatches: newCompleted,
      totalBatches,
      done: newCompleted >= totalBatches,
      rateLimitInfo,
    })
  } catch (err) {
    if (err instanceof AIProviderError && err.code === "rate_limit") {
      // Do NOT mark session as failed — client must retry this batch
      return Response.json(
        {
          error: "Límite de tasa alcanzado. Intenta de nuevo.",
          retryAfterSeconds: err.retryAfterSeconds ?? 60,
        },
        { status: 429 },
      )
    }

    // Non-retryable error — mark session failed
    await serviceClient
      .from("ai_generation_sessions")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "unknown",
        updated_at: new Date().toISOString(),
      })
      .eq("id", generationId)

    return Response.json(
      { error: "Error generando ejercicios. La rutina anterior se mantiene activa." },
      { status: 500 },
    )
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function persistBatchDays(
  client: ServiceClient,
  planId: string,
  outputDays: Array<{
    day_number: number
    exercises: Array<{
      exercise_id: string
      sets: number
      reps_min: number | null
      reps_max: number | null
      duration_seconds: number | null
      rest_seconds: number
      rir: number | null
      notes: string | null
    }>
  }>,
  fullSplit: WorkoutSplit,
): Promise<string | null> {
  const splitMap = new Map(fullSplit.map((d) => [d.day_number, d]))

  for (const outputDay of outputDays) {
    const splitDay = splitMap.get(outputDay.day_number)
    const dayName = splitDay?.name ?? `Día ${outputDay.day_number}`

    const { data: dayRow, error: dayError } = await client
      .from("workout_plan_days")
      .insert({
        workout_plan_id: planId,
        day_number: outputDay.day_number,
        name: dayName,
        description: null,
        sort_order: outputDay.day_number,
      })
      .select("id")
      .single()

    if (dayError || !dayRow) {
      return `Error insertando día ${outputDay.day_number}: ${dayError?.message ?? "unknown"}`
    }

    const exercises = outputDay.exercises.map((ex, idx) => ({
      workout_plan_day_id: dayRow.id,
      exercise_id: ex.exercise_id,
      sort_order: idx + 1,
      sets: ex.sets,
      reps_min: ex.reps_min,
      reps_max: ex.reps_max,
      duration_seconds: ex.duration_seconds,
      rest_seconds: ex.rest_seconds,
      rir: ex.rir,
      notes: ex.notes,
    }))

    const { error: exError } = await client
      .from("workout_plan_exercises")
      .insert(exercises)

    if (exError) {
      return `Error insertando ejercicios del día ${outputDay.day_number}: ${exError.message}`
    }
  }

  return null
}
