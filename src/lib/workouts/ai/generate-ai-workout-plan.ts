/**
 * AI Workout Plan Generator — Main Service
 *
 * Orchestrates the full AI generation flow:
 *   1. Candidate exercise selection
 *   2. History summary (optional context)
 *   3. AI provider call with structured output
 *   4. Zod validation (inside provider)
 *   5. Candidate ID validation
 *   6. Coherence validation
 *   7. create_workout_plan RPC (source='ai')
 *
 * On failure after MAX_RETRIES, falls back to the deterministic generator.
 * The fallback ALWAYS uses source='template'. Never source='ai'.
 *
 * The existing active plan is NOT modified until the RPC succeeds.
 *
 * server-only.
 */

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { UserProfile } from "@/types"
import type { WorkoutAIProvider, WorkoutAIInput } from "@/lib/ai/types"
import { AIProviderError } from "@/lib/ai/types"
import { getCandidateExercises } from "./candidate-exercises"
import { validateCandidateExerciseIds } from "./validate-candidates"
import { validateWorkoutCoherence } from "./validate-coherence"
import { buildHistorySummary } from "./history-summary"
import { generateWorkoutPlan } from "@/lib/workouts/generate-workout-plan"
import type { GeneratePlanResult } from "@/lib/workouts/generate-workout-plan"

/**
 * One provider call per generation — no retries.
 * Free Tier TPM budget (~8k) is consumed by a single request (~5k tokens).
 * Retrying the same payload would exhaust the budget without improving the result.
 * On any failure we fall back to the deterministic generator immediately.
 */
const MAX_RETRIES = 0

export interface GenerateAIWorkoutPlanResult extends GeneratePlanResult {
  source: "ai" | "template"
  fallbackReason?: string
}

interface ObservabilityLog {
  provider: string
  model: string
  elapsed_ms: number
  candidate_count: number
  provider_request_count: number
  retry_count: number
  validation_result: "success" | "candidate_failed" | "coherence_failed" | "zod_failed" | "provider_error"
  fallback_used: boolean
}

function logGeneration(log: ObservabilityLog) {
  // Safe to log — no secrets, no raw user data, no API keys
  console.log("[AI Workout]", JSON.stringify(log))
}

/**
 * Generates a workout plan using AI, with deterministic fallback.
 *
 * @param supabase - Service role client (for RPC + RLS bypass)
 * @param userId   - Authenticated user ID (never from request body)
 * @param profile  - User profile (fitness data only, no PII identifiers)
 * @param provider - WorkoutAIProvider instance (injected for testability)
 */
export async function generateAIWorkoutPlan(
  supabase: SupabaseClient<Database>,
  userId: string,
  profile: UserProfile,
  provider: WorkoutAIProvider,
): Promise<GenerateAIWorkoutPlanResult> {
  const startTime = Date.now()
  const modelName = process.env.GROQ_MODEL ?? "openai/gpt-oss-20b"
  let retryCount = 0
  let validationResult: ObservabilityLog["validation_result"] = "provider_error"

  // 1. Build candidate exercise set
  const candidates = await getCandidateExercises(supabase, profile.objetivo)

  // 2. Build history summary (non-blocking — null on missing history or error)
  const historySummary = await buildHistorySummary(supabase, userId)

  // 3. Compose AI input (only fitness data, no PII identifiers)
  const input: WorkoutAIInput = {
    profile: {
      age: profile.edad ?? null,
      sex: profile.sexo ?? null,
      weight_kg: profile.peso_kg ?? null,
      height_cm: profile.altura_cm ?? null,
      experience: profile.experiencia,
      goal: profile.objetivo,
      days_per_week: profile.dias_por_semana,
    },
    candidates,
    history_summary: historySummary,
  }

  // 4. AI generation loop with one retry
  let lastError: unknown = null
  let lastErrorCategory = "unknown"

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      retryCount++
    }

    try {
      const output = await provider.generateWorkout(input)

      // Dev-only: output shape summary — no exercise_ids, no names, no PII
      if (process.env.NODE_ENV !== "production") {
        console.log("[AI Output Shape]", JSON.stringify({
          name_present: Boolean(output.name),
          summary_present: Boolean(output.summary),
          day_count: output.days.length,
          days: output.days.map((d) => ({
            day_number: d.day_number,
            name_present: Boolean(d.name),
            exercise_count: d.exercises.length,
          })),
        }))
      }

      // 5. Candidate ID validation (critical: reject any UUID not in candidate set)
      const candidateErrors = validateCandidateExerciseIds(output, candidates)
      if (candidateErrors.length > 0) {
        validationResult = "candidate_failed"
        lastErrorCategory = "candidate"
        lastError = new Error(
          `AI returned exercise_ids not in candidate set: ${candidateErrors.map((e) => e.exercise_id).join(", ")}`,
        )
        continue
      }

      // 6. Coherence validation
      const coherenceErrors = validateWorkoutCoherence(output, profile.dias_por_semana)
      if (coherenceErrors.length > 0) {
        validationResult = "coherence_failed"
        lastErrorCategory = "coherence"
        lastError = new Error(
          `AI output coherence failed: ${coherenceErrors.map((e) => e.message).join("; ")}`,
        )

        // Dev-only: structured coherence diagnosis — no PII, no prompt, no candidate names
        if (process.env.NODE_ENV !== "production") {
          console.error("[AI Coherence Debug]", JSON.stringify({
            issues: coherenceErrors.map((e) => ({
              code: e.code,
              day_number: e.day_number,
              exercise_index: e.exercise_index,
            })),
            expected_days: profile.dias_por_semana,
            actual_days: output.days.length,
            day_numbers: output.days.map((d) => d.day_number),
            exercise_counts: output.days.map((d) => d.exercises.length),
          }))
        }

        continue
      }

      validationResult = "success"

      // 7. Build RPC payload from validated output
      const days = output.days
        .sort((a, b) => a.day_number - b.day_number)
        .map((day, dayIdx) => ({
          day_number: day.day_number,
          name: day.name,
          description: day.description,
          sort_order: dayIdx + 1,
          exercises: day.exercises.map((ex, exIdx) => ({
            exercise_id: ex.exercise_id,
            sort_order: exIdx + 1,
            sets: ex.sets,
            reps_min: ex.reps_min,
            reps_max: ex.reps_max,
            duration_seconds: ex.duration_seconds,
            rest_seconds: ex.rest_seconds,
            rir: ex.rir,
            notes: ex.notes,
          })),
        }))

      // 8. Transactional RPC: archives previous active plan, creates new AI plan
      const { data: planId, error: rpcError } = await supabase.rpc("create_workout_plan", {
        p_user_id: userId,
        p_name: output.name,
        p_goal: profile.objetivo,
        p_experience: profile.experiencia,
        p_days_per_week: profile.dias_por_semana,
        p_source: "ai",
        p_days: days as unknown as Database["public"]["Functions"]["create_workout_plan"]["Args"]["p_days"],
      })

      if (rpcError) {
        throw new Error(`Error creando el plan: ${rpcError.message}`)
      }

      if (!planId) {
        throw new Error("El RPC no devolvió el ID del plan")
      }

      logGeneration({
        provider: "groq",
        model: modelName,
        elapsed_ms: Date.now() - startTime,
        candidate_count: candidates.length,
        provider_request_count: retryCount + 1,
        retry_count: retryCount,
        validation_result: validationResult,
        fallback_used: false,
      })

      return {
        planId: planId as string,
        source: "ai",
        resolvedExercises: days.reduce((sum, d) => sum + d.exercises.length, 0),
        unresolvedExercises: [],
        emptyDays: [],
      }
    } catch (err) {
      lastError = err
      lastErrorCategory = err instanceof AIProviderError ? err.code : "unknown"

      // Non-retryable: these errors won't be resolved by retrying the same request
      if (
        err instanceof AIProviderError &&
        (err.code === "config" ||
          err.code === "auth" ||
          err.code === "request_too_large" ||
          err.code === "schema")
      ) {
        break
      }
    }
  }

  // 9. Fallback to deterministic generator
  const fallbackReason =
    lastError instanceof Error ? lastError.message : "AI generation failed"

  // Only log the reason category, never the full error chain
  console.warn("[AI Workout] Using deterministic fallback. Reason category:", lastErrorCategory)

  logGeneration({
    provider: "groq",
    model: modelName,
    elapsed_ms: Date.now() - startTime,
    candidate_count: candidates.length,
    provider_request_count: retryCount + 1,
    retry_count: retryCount,
    validation_result: validationResult,
    fallback_used: true,
  })

  let templateResult: GeneratePlanResult
  try {
    templateResult = await generateWorkoutPlan(supabase, userId, profile)
  } catch (templateErr) {
    const templateReason = templateErr instanceof Error ? templateErr.message : "deterministic generator failed"
    throw new Error(
      `AI generation failed (${fallbackReason}); deterministic fallback also failed (${templateReason}). Existing plan preserved.`,
    )
  }

  return {
    ...templateResult,
    source: "template",
    fallbackReason,
  }
}
