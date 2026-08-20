import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { toUserProfile } from "@/lib/fitness-data"
import { generateWorkoutPlan } from "@/lib/workouts/generate-workout-plan"

export const runtime = "nodejs"

export async function POST() {
  // 1. Verificar sesión con cliente autenticado (anon key + cookies)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Cargar perfil del usuario
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("goal, experience, days_per_week")
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
    age: null,
    sex: null,
    weight_kg: null,
    height_cm: null,
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

  // 3. Generar plan con service_role (necesario para RPC + bypass de RLS)
  const serviceClient = createServiceRoleClient()

  try {
    const result = await generateWorkoutPlan(serviceClient, user.id, profile)

    return Response.json({
      planId: result.planId,
      resolvedExercises: result.resolvedExercises,
      unresolvedCount: result.unresolvedExercises.length,
      emptyDays: result.emptyDays,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error generando la rutina"
    return Response.json({ error: message }, { status: 500 })
  }
}
