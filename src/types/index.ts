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
  musculo: string
  ejercicios: Ejercicio[]
}

export interface Rutina {
  id: string
  titulo: string
  descripcion: string
  objetivo: Objetivo
  experiencia: Experiencia
  dias_por_semana: number
  duracion_semanas: number
  dias: DiaRutina[]
}

export interface RecursoPDF {
  id: string
  titulo: string
  descripcion: string
  categoria: "nutricion" | "entrenamiento" | "recuperacion" | "motivacion"
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
