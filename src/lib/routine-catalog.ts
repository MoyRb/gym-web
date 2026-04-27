import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { Experiencia, Objetivo, Rutina, UserProfile } from "@/types"

export type RoutineTemplateRow = Database["public"]["Tables"]["routine_templates"]["Row"]

const EXPERIENCE_ORDER: Experiencia[] = ["principiante", "intermedio", "avanzado"]

function getDistance(a: Experiencia, b: Experiencia) {
  return Math.abs(EXPERIENCE_ORDER.indexOf(a) - EXPERIENCE_ORDER.indexOf(b))
}

function compareByDaysAndExperience(
  a: RoutineTemplateRow,
  b: RoutineTemplateRow,
  profile: Pick<UserProfile, "experiencia" | "dias_por_semana">,
) {
  const byDays = Math.abs(a.days_per_week - profile.dias_por_semana) - Math.abs(b.days_per_week - profile.dias_por_semana)
  if (byDays !== 0) return byDays

  return getDistance(a.experience as Experiencia, profile.experiencia) - getDistance(b.experience as Experiencia, profile.experiencia)
}

export function toRutinaFromTemplate(row: RoutineTemplateRow): Rutina {
  const routineData = row.routine_data as {
    dias?: Rutina["dias"]
    recomendaciones_generales?: string[]
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug ?? undefined,
    short_description: row.short_description,
    level_label: row.level_label,
    objetivo: row.goal as Objetivo,
    experiencia: row.experience as Experiencia,
    dias_por_semana: row.days_per_week,
    duracion_semanas: row.duration_weeks,
    estimated_session_minutes: row.estimated_session_minutes,
    focus_areas: row.focus_areas,
    dias: routineData.dias ?? [],
    recomendaciones_generales: routineData.recomendaciones_generales ?? [],
  }
}

export function pickBestRoutineTemplate(
  templates: RoutineTemplateRow[],
  profile: Pick<UserProfile, "objetivo" | "experiencia" | "dias_por_semana">,
): RoutineTemplateRow | null {
  if (templates.length === 0) return null

  const exact = templates.find(
    (t) =>
      t.goal === profile.objetivo &&
      t.experience === profile.experiencia &&
      t.days_per_week === profile.dias_por_semana,
  )

  if (exact) return exact

  const sameGoalAndExperience = templates
    .filter((t) => t.goal === profile.objetivo && t.experience === profile.experiencia)
    .sort((a, b) => Math.abs(a.days_per_week - profile.dias_por_semana) - Math.abs(b.days_per_week - profile.dias_por_semana))

  if (sameGoalAndExperience.length > 0) {
    return sameGoalAndExperience[0]
  }

  const sameGoal = templates
    .filter((t) => t.goal === profile.objetivo)
    .sort((a, b) => compareByDaysAndExperience(a, b, profile))

  if (sameGoal.length > 0) {
    return sameGoal[0]
  }

  return templates.sort((a, b) => compareByDaysAndExperience(a, b, profile))[0]
}

export async function findTemplateForProfile(
  supabase: SupabaseClient<Database>,
  profile: Pick<UserProfile, "objetivo" | "experiencia" | "dias_por_semana">,
): Promise<RoutineTemplateRow | null> {
  const { data, error } = await supabase
    .from("routine_templates")
    .select("*")
    .eq("is_active", true)

  if (error) {
    throw new Error(`No se pudieron cargar las plantillas de rutina: ${error.message}`)
  }

  return pickBestRoutineTemplate(data ?? [], profile)
}


export function normalizeRoutineData(raw: unknown): Rutina | null {
  if (!raw || typeof raw !== "object") return null
  const source = raw as Record<string, unknown>

  const title = typeof source.title === "string"
    ? source.title
    : typeof source.titulo === "string"
      ? source.titulo
      : "Rutina personalizada"

  const shortDescription = typeof source.short_description === "string"
    ? source.short_description
    : typeof source.descripcion === "string"
      ? source.descripcion
      : "Plan recomendado según tu perfil"

  const dias = Array.isArray(source.dias) ? (source.dias as Rutina["dias"]).map((d, idx) => ({
    ...d,
    nombre_dia: d.nombre_dia ?? d.dia ?? `Día ${idx + 1}`,
    enfoque: d.enfoque ?? d.musculo ?? "Sesión de entrenamiento",
  })) : []

  return {
    id: typeof source.id === "string" ? source.id : "routine-generated",
    title,
    slug: typeof source.slug === "string" ? source.slug : undefined,
    short_description: shortDescription,
    level_label: typeof source.level_label === "string" ? source.level_label : "Nivel personalizado",
    objetivo: (source.objetivo as Objetivo) ?? "mejorar_condicion_general",
    experiencia: (source.experiencia as Experiencia) ?? "principiante",
    dias_por_semana: typeof source.dias_por_semana === "number" ? source.dias_por_semana : dias.length,
    duracion_semanas: typeof source.duracion_semanas === "number" ? source.duracion_semanas : 8,
    estimated_session_minutes: typeof source.estimated_session_minutes === "number" ? source.estimated_session_minutes : 60,
    focus_areas: Array.isArray(source.focus_areas) ? (source.focus_areas as string[]) : [],
    dias,
    recomendaciones_generales: Array.isArray(source.recomendaciones_generales)
      ? (source.recomendaciones_generales as string[])
      : [],
  }
}
