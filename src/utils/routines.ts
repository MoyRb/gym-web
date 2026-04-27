import type { Experiencia, Objetivo } from "@/types"

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
