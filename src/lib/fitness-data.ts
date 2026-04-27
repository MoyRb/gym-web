import { calcularIMC } from "@/utils/imc"
import type { Database, Json, ResourceCategory } from "@/types/database"
import type { Objetivo, Experiencia, RecursoPDF, UserProfile } from "@/types"

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

export function toUserProfile(row: ProfileRow): UserProfile {
  return {
    nombre: row.full_name ?? "",
    edad: row.age ?? 25,
    sexo: (row.sex as UserProfile["sexo"]) ?? "otro",
    peso_kg: Number(row.weight_kg ?? 70),
    altura_cm: Number(row.height_cm ?? 170),
    experiencia: (row.experience as Experiencia) ?? "principiante",
    objetivo: (row.goal as Objetivo) ?? "mejorar_condicion_general",
    dias_por_semana: row.days_per_week ?? 3,
  }
}

export function toProfileInsert(
  userId: string,
  username: string,
  profile: UserProfile,
): Database["public"]["Tables"]["profiles"]["Insert"] {
  const imc = calcularIMC(profile.peso_kg, profile.altura_cm)
  const hasValidImc = typeof imc.value === "number" && Number.isFinite(imc.value)
  return {
    id: userId,
    username,
    full_name: profile.nombre,
    age: profile.edad,
    sex: profile.sexo,
    weight_kg: profile.peso_kg,
    height_cm: profile.altura_cm,
    experience: profile.experiencia,
    goal: profile.objetivo,
    days_per_week: profile.dias_por_semana,
    bmi: hasValidImc ? imc.value : null,
    bmi_category: hasValidImc ? imc.categoria : null,
  }
}

export function toRoutineInsert(userId: string, routine: Database["public"]["Tables"]["routine_templates"]["Row"]) {
  return {
    user_id: userId,
    title: routine.title,
    description: routine.short_description,
    goal: routine.goal,
    experience: routine.experience,
    days_per_week: routine.days_per_week,
    routine_data: {
      id: routine.id,
      title: routine.title,
      slug: routine.slug,
      short_description: routine.short_description,
      level_label: routine.level_label,
      objetivo: routine.goal,
      experiencia: routine.experience,
      dias_por_semana: routine.days_per_week,
      duracion_semanas: routine.duration_weeks,
      estimated_session_minutes: routine.estimated_session_minutes,
      focus_areas: routine.focus_areas,
      ...((routine.routine_data as Record<string, unknown>) ?? {}),
    } as Json,
  }
}

export function mapResource(row: Database["public"]["Tables"]["resources"]["Row"]): RecursoPDF {
  const url = row.file_url?.trim() ?? ""
  return {
    id: row.id,
    titulo: row.title,
    descripcion: row.description,
    categoria: row.category,
    url,
    disponible: url.length > 0,
    paginas: undefined,
    tamaño: undefined,
    destacado: false,
  }
}

export interface AdminAnalytics {
  totalUsuarios: number
  usuariosNuevosEsteMes: number
  perfilesCompletados: number
  objetivoStats: Array<{ objetivo: string; count: number; porcentaje: number; color: string }>
  imcStats: Array<{ categoria: string; count: number; porcentaje: number; color: string }>
  routineStats: Array<{ titulo: string; vistas: number; objetivo: string }>
  pdfStats: Array<{ titulo: string; descargas: number; categoria: string }>
}

const COLOR_BY_GOAL: Record<string, string> = {
  ganar_masa_muscular: "#E11392",
  bajar_grasa: "#323E49",
  mejorar_resistencia: "#F59E0B",
  mejorar_condicion_general: "#10B981",
}

const COLOR_BY_IMC: Record<string, string> = {
  "Bajo peso": "#6366F1",
  "Peso normal": "#10B981",
  Sobrepeso: "#F59E0B",
  "Obesidad grado I": "#EF4444",
  "Obesidad grado II+": "#B91C1C",
}

export function formatGoal(goal: string) {
  return goal.replaceAll("_", " ")
}

export function getMonthStartIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

export function percentage(part: number, total: number) {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

export function goalColor(goal: string) {
  return COLOR_BY_GOAL[goal] ?? "#64748B"
}

export function imcColor(category: string) {
  return COLOR_BY_IMC[category] ?? "#64748B"
}

export function categoryLabel(category: ResourceCategory): string {
  const labels: Record<ResourceCategory, string> = {
    rutinas: "Rutinas",
    calentamiento: "Calentamiento",
    movilidad: "Movilidad",
    cardio: "Cardio",
    nutricion_basica: "Nutrición básica",
    recuperacion: "Recuperación",
    principiantes: "Principiantes",
    nutricion: "Nutrición",
    entrenamiento: "Entrenamiento",
    motivacion: "Motivación",
  }
  return labels[category]
}
