/**
 * Mock data para el panel de administrador.
 * TODO: Reemplazar con queries reales a Supabase.
 */

export interface AdminStats {
  totalUsuarios: number
  usuariosNuevosEsteMes: number
  perfilesCompletados: number
}

export interface ObjetivoStat {
  objetivo: string
  count: number
  porcentaje: number
  color: string
}

export interface ImcCategoryStat {
  categoria: string
  count: number
  porcentaje: number
  color: string
}

export interface RoutineStat {
  titulo: string
  vistas: number
  objetivo: string
}

export interface PdfStat {
  titulo: string
  descargas: number
  categoria: string
}

export interface DailyActivity {
  dia: string
  registros: number
  sesiones: number
}

export const mockAdminStats: AdminStats = {
  totalUsuarios: 127,
  usuariosNuevosEsteMes: 23,
  perfilesCompletados: 98,
}

export const mockObjetivoStats: ObjetivoStat[] = [
  { objetivo: "Ganar masa muscular", count: 51, porcentaje: 40, color: "#E11392" },
  { objetivo: "Bajar grasa", count: 38, porcentaje: 30, color: "#323E49" },
  { objetivo: "Mejorar resistencia", count: 25, porcentaje: 20, color: "#F59E0B" },
  { objetivo: "Condición general", count: 13, porcentaje: 10, color: "#10B981" },
]

export const mockImcStats: ImcCategoryStat[] = [
  { categoria: "Peso normal", count: 57, porcentaje: 45, color: "#10B981" },
  { categoria: "Sobrepeso", count: 38, porcentaje: 30, color: "#F59E0B" },
  { categoria: "Bajo peso", count: 19, porcentaje: 15, color: "#6366F1" },
  { categoria: "Obesidad", count: 13, porcentaje: 10, color: "#EF4444" },
]

export const mockRoutineStats: RoutineStat[] = [
  { titulo: "Hipertrofia Principiantes", vistas: 89, objetivo: "Ganar masa" },
  { titulo: "Quema de Grasa 4 días", vistas: 64, objetivo: "Bajar grasa" },
  { titulo: "Condición General 3 días", vistas: 47, objetivo: "General" },
  { titulo: "Resistencia Funcional 5 días", vistas: 31, objetivo: "Resistencia" },
]

export const mockPdfStats: PdfStat[] = [
  { titulo: "Guía de Nutrición para Hipertrofia", descargas: 73, categoria: "Nutrición" },
  { titulo: "Técnica Perfecta: Los 5 Básicos", descargas: 61, categoria: "Entrenamiento" },
  { titulo: "Plan de Déficit Calórico", descargas: 44, categoria: "Nutrición" },
  { titulo: "Movilidad Articular", descargas: 38, categoria: "Recuperación" },
  { titulo: "Mentalidad del Atleta", descargas: 29, categoria: "Motivación" },
]

export const mockDailyActivity: DailyActivity[] = [
  { dia: "Lun", registros: 4, sesiones: 18 },
  { dia: "Mar", registros: 2, sesiones: 22 },
  { dia: "Mié", registros: 6, sesiones: 25 },
  { dia: "Jue", registros: 1, sesiones: 20 },
  { dia: "Vie", registros: 5, sesiones: 28 },
  { dia: "Sáb", registros: 3, sesiones: 15 },
  { dia: "Dom", registros: 2, sesiones: 9 },
]
