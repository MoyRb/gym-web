import type { Objetivo, Experiencia, Rutina } from "@/types"
import { mockRutinas } from "@/data/mock-data"

export function recomendarRutina(
  objetivo: Objetivo,
  experiencia: Experiencia,
  dias_por_semana: number
): Rutina {
  // First try exact match
  let rutina = mockRutinas.find(
    (r) =>
      r.objetivo === objetivo &&
      r.experiencia === experiencia &&
      r.dias_por_semana === dias_por_semana
  )

  if (rutina) return rutina

  // Try matching objetivo and experiencia with closest days
  const byObjetivoExp = mockRutinas.filter(
    (r) => r.objetivo === objetivo && r.experiencia === experiencia
  )

  if (byObjetivoExp.length > 0) {
    rutina = byObjetivoExp.reduce((prev, curr) =>
      Math.abs(curr.dias_por_semana - dias_por_semana) <
      Math.abs(prev.dias_por_semana - dias_por_semana)
        ? curr
        : prev
    )
    return rutina
  }

  // Try matching only objetivo
  const byObjetivo = mockRutinas.filter((r) => r.objetivo === objetivo)

  if (byObjetivo.length > 0) {
    rutina = byObjetivo.reduce((prev, curr) =>
      Math.abs(curr.dias_por_semana - dias_por_semana) <
      Math.abs(prev.dias_por_semana - dias_por_semana)
        ? curr
        : prev
    )
    return rutina
  }

  // Fallback: first routine
  return mockRutinas[0]
}

export function getObjetivoLabel(objetivo: Objetivo): string {
  const labels: Record<Objetivo, string> = {
    ganar_masa_muscular: "Ganar masa muscular",
    bajar_grasa: "Bajar grasa",
    mejorar_resistencia: "Mejorar resistencia",
    mejorar_condicion_general: "Mejorar condición general",
  }
  return labels[objetivo]
}

export function getExperienciaLabel(experiencia: Experiencia): string {
  const labels: Record<Experiencia, string> = {
    principiante: "Principiante",
    intermedio: "Intermedio",
    avanzado: "Avanzado",
  }
  return labels[experiencia]
}
