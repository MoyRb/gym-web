export type Objetivo =
  | "ganar_masa_muscular"
  | "bajar_grasa"
  | "mejorar_resistencia"
  | "mejorar_condicion_general"

export type Experiencia = "principiante" | "intermedio" | "avanzado"
export type Sexo = "masculino" | "femenino" | "otro"

export interface UserProfile {
  nombre: string
  edad: number
  sexo: Sexo
  peso_kg: number
  altura_cm: number
  experiencia: Experiencia
  objetivo: Objetivo
  dias_por_semana: number
}

export interface ImcResult {
  value: number | null
  categoria: string
  descripcion: string
  color: string
  showProgress: boolean
}

export interface Ejercicio {
  nombre: string
  series: number
  repeticiones: string
  descanso: string
  notas?: string
}

export interface DiaRutina {
  dia: string
  nombre_dia: string
  enfoque: string
  musculo: string
  ejercicios: Ejercicio[]
  notas?: string
}

export interface Rutina {
  id: string
  title: string
  slug?: string
  short_description: string
  level_label: string
  objetivo: Objetivo
  experiencia: Experiencia
  dias_por_semana: number
  duracion_semanas: number
  estimated_session_minutes: number
  focus_areas: string[]
  dias: DiaRutina[]
  recomendaciones_generales?: string[]
}

export type RecursoCategoria =
  | "rutinas"
  | "calentamiento"
  | "movilidad"
  | "cardio"
  | "nutricion_basica"
  | "recuperacion"
  | "principiantes"
  | "nutricion"
  | "entrenamiento"
  | "motivacion"

export interface RecursoPDF {
  id: string
  titulo: string
  descripcion: string
  categoria: RecursoCategoria
  paginas?: number
  tamaño?: string
  url: string
  destacado?: boolean
}

export interface AnalyticsEvent {
  event: string
  properties?: Record<string, unknown>
  timestamp?: string
}

export interface RoutineRecommendation {
  id: string
  title: string
  description: string
  goal: Objetivo
  experience: Experiencia
  days_per_week: number
  routine_data: Rutina
}


export interface Testimonio {
  id: string
  nombre: string
  avatar: string
  cargo: string
  texto: string
  rating: number
  objetivo: string
}
