/**
 * POST /api/workout/generate-ai/start
 *
 * Initiates a chunked AI workout generation session.
 *
 * Steps:
 *   1. Authenticate — userId never from request body.
 *   2. Load profile (fitness data only).
 *   3. Build deterministic workout split.
 *   4. Fetch all candidate exercises.
 *   5. Create draft workout_plan (status='draft', is_active=false).
 *   6. Create ai_generation_session record.
 *   7. Process batch 0: AI selects exercise IDs → prescription engine fills values.
 *   8. Persist batch 0 days to draft plan.
 *   9. Return generation state to client.
 *
 * Security:
 * - userId from authenticated session only.
 * - Candidates and split built server-side; client sends nothing.
 * - Draft plan never shown as active until finalize is called.
 * - Only goal + experience sent to AI — no age, weight, height, or sex.
 *
 * Response:
 *   { generationId, draftPlanId, totalBatches, completedBatches, rateLimitInfo? }
 */

import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import { toUserProfile } from "@/lib/fitness-data"
import { buildWorkoutSplit, buildBatches } from "@/lib/workouts/ai/workout-split"
import { getCandidateExercises } from "@/lib/workouts/ai/candidate-exercises"
import { getCandidatesForBatch, validateSelectionCandidateIds, validateBatchDayNumbers, validateBodyPartVariety } from "@/lib/workouts/ai/batch-candidates"
import { prescribeExercise, getExerciseCountBounds } from "@/lib/workouts/prescription/prescribe"
import { getWorkoutAIProvider } from "@/lib/ai/provider"
import { AIProviderError } from "@/lib/ai/types"
import type { ExerciseSelectionBatchInput, RateLimitInfo } from "@/lib/ai/types"
import type { GroqWorkoutProvider } from "@/lib/ai/providers/groq"
import type { Json } from "@/types/database"
import type { SelectionContext } from "@/lib/workouts/equipment/equipment-score"
import type { TrainingEnvironment, HomeEquipment } from "@/lib/workouts/equipment/equipment-categories"

export const runtime = "nodejs"

export async function POST() {
  // 1. Authenticate
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Load profile
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("goal, experience, days_per_week, age, sex, weight_kg, height_cm, training_environment, available_equipment")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError) {
    return Response.json({ error: "Error cargando el perfil" }, { status: 500 })
  }

  if (!profileRow?.goal || !profileRow?.experience || !profileRow?.days_per_week) {
    return Response.json(
      { error: "Completa tu perfil antes de generar una rutina" },
      { status: 422 },
    )
  }

  const profile = toUserProfile({
    id: user.id,
    username: "",
    full_name: null,
    age: profileRow.age,
    sex: profileRow.sex,
    weight_kg: profileRow.weight_kg,
    height_cm: profileRow.height_cm,
    experience: profileRow.experience,
    goal: profileRow.goal,
    days_per_week: profileRow.days_per_week,
    bmi: null,
    bmi_category: null,
    is_admin: null,
    training_environment: profileRow.training_environment,
    available_equipment: profileRow.available_equipment,
    created_at: "",
    updated_at: "",
  })

  // Check feature flag
  if (process.env.AI_WORKOUT_GENERATION_ENABLED !== "true") {
    return Response.json(
      { error: "El generador de IA no está disponible en este momento" },
      { status: 503 },
    )
  }

  // Get AI provider (must support generateBatchSelection)
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

  const serviceClient = createServiceRoleClient()

  // 3. Build deterministic split and batches
  const split = buildWorkoutSplit(profile.dias_por_semana, profile.objetivo)
  const batches = buildBatches(split)
  const totalBatches = batches.length

  // 4. Build selection context from profile environment preferences
  const trainingEnvironment = profileRow.training_environment as TrainingEnvironment | null
  const selectionContext: SelectionContext | undefined = trainingEnvironment
    ? {
        environment: trainingEnvironment,
        availableEquipment: (profileRow.available_equipment as HomeEquipment[] | null) ?? null,
        experience: profile.experiencia,
        goal: profile.objetivo,
      }
    : undefined

  // 5. Fetch candidates (scored/ranked by context, stored in session for subsequent batches)
  const allCandidates = await getCandidateExercises(serviceClient, profile.objetivo, selectionContext)

  // 6. Build history summary (non-blocking)
  const { buildHistorySummary } = await import("@/lib/workouts/ai/history-summary")
  const historySummary = await buildHistorySummary(serviceClient, user.id)

  // 7. Create draft plan
  const planName = `Plan IA — ${profile.objetivo.replace(/_/g, " ")}`
  const { data: draftPlan, error: draftError } = await serviceClient
    .from("workout_plans")
    .insert({
      user_id: user.id,
      name: planName,
      goal: profile.objetivo,
      experience: profile.experiencia,
      days_per_week: profile.dias_por_semana,
      source: "ai",
      status: "draft",
      is_active: false,
    })
    .select("id")
    .single()

  if (draftError || !draftPlan) {
    return Response.json({ error: "Error creando el borrador del plan" }, { status: 500 })
  }

  const draftPlanId = draftPlan.id

  // 8. Create generation session
  const { data: session, error: sessionError } = await serviceClient
    .from("ai_generation_sessions")
    .insert({
      user_id: user.id,
      draft_plan_id: draftPlanId,
      status: "in_progress",
      total_batches: totalBatches,
      completed_batches: 0,
      split_json: split as unknown as Json,
      candidates_json: allCandidates as unknown as Json,
    })
    .select("id")
    .single()

  if (sessionError || !session) {
    // Clean up draft plan
    await serviceClient.from("workout_plans").delete().eq("id", draftPlanId)
    return Response.json({ error: "Error iniciando la sesión de generación" }, { status: 500 })
  }

  const generationId = session.id

  // Track generation started (fire and forget)
  void trackServerEvent({
    name: EVENTS.AI_GENERATION_STARTED,
    userId: user.id,
    workoutPlanId: draftPlanId,
    metadata: {
      generation_id: generationId,
      total_batches: totalBatches,
      goal: profile.objetivo,
      experience: profile.experiencia,
    },
    dedupeKey: `ai_gen_started:${generationId}`,
  })

  // 9. Process batch 0 — AI selects IDs, backend prescribes values
  const batch0 = batches[0]
  const batch0Candidates = getCandidatesForBatch(allCandidates, batch0)
  const { min: minEx, max: maxEx } = getExerciseCountBounds(profile.dias_por_semana, profile.experiencia)

  const selectionInput: ExerciseSelectionBatchInput = {
    profile: {
      goal: profile.objetivo,
      experience: profile.experiencia,
      training_environment: trainingEnvironment,
    },
    batch_days: batch0.map((d) => ({ day_number: d.day_number, name: d.name })),
    candidates: batch0Candidates,
    history_summary: historySummary,
    min_exercises_per_day: minEx,
    max_exercises_per_day: maxEx,
  }

  let completedBatches = 0
  let rateLimitInfo: RateLimitInfo | null = null

  try {
    const selectionResult = await provider.generateBatchSelection(selectionInput)
    rateLimitInfo = selectionResult.rateLimitInfo

    // Validate day numbers
    const dayNumberError = validateBatchDayNumbers(
      selectionResult.output.days,
      batch0.map((d) => d.day_number),
    )
    if (dayNumberError) {
      throw new Error(`Batch 0 day validation failed: ${dayNumberError}`)
    }

    // Validate candidate IDs
    const candidateMap = new Map(batch0Candidates.map((c) => [c.id, c]))
    const candidateErrors = validateSelectionCandidateIds(selectionResult.output.days, batch0Candidates)
    if (candidateErrors.length > 0) {
      throw new Error(
        `Batch 0 returned invalid exercise_ids: ${candidateErrors.map((e) => e.exercise_id).join(", ")}`,
      )
    }

    // Validate body_part variety for broad-focus days
    const varietyError = validateBodyPartVariety(selectionResult.output.days, batch0, candidateMap)
    if (varietyError) {
      throw new Error(`Batch 0 variety check failed: ${varietyError}`)
    }

    // Prescribe exercises for selected IDs
    const prescribedDays = selectionResult.output.days.map((selDay) => ({
      day_number: selDay.day_number,
      exercises: selDay.exercise_ids.slice(0, maxEx).map((exId) => {
        const meta = candidateMap.get(exId)!
        return prescribeExercise(exId, meta, profile.objetivo, profile.experiencia)
      }),
    }))

    // Persist batch 0 days to draft plan
    const persistError = await persistBatchDays(serviceClient, draftPlanId, prescribedDays, split)
    if (persistError) throw new Error(persistError)

    // Update session
    await serviceClient
      .from("ai_generation_sessions")
      .update({ completed_batches: 1, updated_at: new Date().toISOString() })
      .eq("id", generationId)

    completedBatches = 1
  } catch (err) {
    // If batch 0 fails due to rate limit, keep session alive for client retry
    if (err instanceof AIProviderError && err.code === "rate_limit") {
      rateLimitInfo = { remainingTokens: null, retryAfterSeconds: err.retryAfterSeconds }
      // completedBatches stays 0 — client calls /next to retry batch 0
    } else {
      // Mark session failed — non-retryable
      const errorMessage = err instanceof Error ? err.message : "unknown"
      await serviceClient
        .from("ai_generation_sessions")
        .update({
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", generationId)

      void trackServerEvent({
        name: EVENTS.AI_GENERATION_FAILED,
        userId: user.id,
        workoutPlanId: draftPlanId,
        metadata: { generation_id: generationId, error: errorMessage },
      })

      return Response.json(
        { error: "Error generando el primer lote de ejercicios. Intenta de nuevo." },
        { status: 500 },
      )
    }
  }

  return Response.json({
    generationId,
    draftPlanId,
    totalBatches,
    completedBatches,
    rateLimitInfo,
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { WorkoutSplit } from "@/lib/workouts/ai/workout-split"

type ServiceClient = SupabaseClient<Database>

/**
 * Inserts days and exercises from a batch into the draft plan.
 * @returns Error message string if failed, null on success.
 */
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
