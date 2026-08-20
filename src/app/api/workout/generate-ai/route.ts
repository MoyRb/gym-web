/**
 * POST /api/workout/generate-ai
 *
 * Generates a workout plan using AI (or falls back to the deterministic generator).
 *
 * Security:
 * - userId is obtained from the authenticated session, NEVER from the request body.
 * - GROQ_API_KEY is server-side only, never logged or returned.
 * - Feature flag: AI_WORKOUT_GENERATION_ENABLED must be "true" to call the provider.
 *
 * Response:
 * - { planId, source: 'ai'|'template', fallback: boolean, resolvedExercises: number }
 * - On error: { error: string }
 */

import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { toUserProfile } from "@/lib/fitness-data"
import { generateAIWorkoutPlan } from "@/lib/workouts/ai/generate-ai-workout-plan"
import { generateWorkoutPlan } from "@/lib/workouts/generate-workout-plan"
import { getWorkoutAIProvider } from "@/lib/ai/provider"
import { AIProviderError } from "@/lib/ai/types"

export const runtime = "nodejs"

export async function POST() {
  // 1. Authenticate — userId NEVER comes from the request body
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Load full profile (fitness data only — no auth tokens or admin fields)
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("goal, experience, days_per_week, age, sex, weight_kg, height_cm")
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
    training_environment: null,
    available_equipment: null,
    created_at: "",
    updated_at: "",
  })

  const serviceClient = createServiceRoleClient()

  // 3. Feature flag — when disabled, use template directly (no AI call)
  const featureEnabled = process.env.AI_WORKOUT_GENERATION_ENABLED === "true"

  if (!featureEnabled) {
    try {
      const result = await generateWorkoutPlan(serviceClient, user.id, profile)
      return Response.json({
        planId: result.planId,
        source: "template" as const,
        fallback: true,
        fallbackReason: "AI workout generation is not enabled",
        resolvedExercises: result.resolvedExercises,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error generando la rutina"
      return Response.json({ error: message }, { status: 500 })
    }
  }

  // 4. Get AI provider (throws AIProviderError("config") if not configured)
  let provider
  try {
    provider = getWorkoutAIProvider()
  } catch (err) {
    if (err instanceof AIProviderError && err.code === "config") {
      // Reveal only the generic message, not the internal error
      return Response.json(
        { error: "El generador de IA no está disponible en este momento" },
        { status: 503 },
      )
    }
    return Response.json({ error: "Error interno del servidor" }, { status: 500 })
  }

  // 5. Generate AI plan (with fallback on runtime failure)
  try {
    const result = await generateAIWorkoutPlan(serviceClient, user.id, profile, provider)
    return Response.json({
      planId: result.planId,
      source: result.source,
      fallback: result.source === "template",
      fallbackReason: result.fallbackReason,
      resolvedExercises: result.resolvedExercises,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando la rutina"
    return Response.json({ error: message }, { status: 500 })
  }
}
