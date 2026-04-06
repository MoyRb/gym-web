import type { ImcResult } from "@/types"

const IMC_SAFE_FALLBACK: ImcResult = {
  value: null,
  categoria: "Sin datos",
  descripcion: "Ingresa peso y altura válidos para calcular tu IMC",
  color: "text-muted-foreground",
  showProgress: false,
}

function isPositiveFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function calcularIMC(peso_kg: number, altura_cm: number): ImcResult {
  if (!isPositiveFiniteNumber(peso_kg) || !isPositiveFiniteNumber(altura_cm)) {
    return IMC_SAFE_FALLBACK
  }

  const alturaM = altura_cm / 100
  const imc = peso_kg / (alturaM * alturaM)
  const value = Math.round(imc * 10) / 10
  if (!Number.isFinite(value)) {
    return IMC_SAFE_FALLBACK
  }

  if (value < 18.5) {
    return {
      value,
      categoria: "Bajo peso",
      descripcion: "Tu peso está por debajo del rango saludable. Considera un plan enfocado en ganar masa muscular con supervisión.",
      color: "text-blue-500",
      showProgress: true,
    }
  } else if (value < 25) {
    return {
      value,
      categoria: "Peso normal",
      descripcion: "¡Excelente! Estás en un rango de peso saludable. Mantén tus hábitos y optimiza tu rendimiento.",
      color: "text-green-500",
      showProgress: true,
    }
  } else if (value < 30) {
    return {
      value,
      categoria: "Sobrepeso",
      descripcion: "Estás ligeramente por encima del rango saludable. Un plan combinado de fuerza y cardio te ayudará a alcanzar tu peso ideal.",
      color: "text-yellow-500",
      showProgress: true,
    }
  } else if (value < 35) {
    return {
      value,
      categoria: "Obesidad grado I",
      descripcion: "Te recomendamos un plan enfocado en pérdida de grasa con progresión gradual y control nutricional.",
      color: "text-orange-500",
      showProgress: true,
    }
  } else {
    return {
      value,
      categoria: "Obesidad grado II+",
      descripcion: "Es importante consultar con un profesional de la salud antes de iniciar un programa intensivo de ejercicio.",
      color: "text-red-500",
      showProgress: true,
    }
  }
}

export function getImcBarWidth(imc: number): number {
  const min = 15
  const max = 40
  return Math.min(100, Math.max(0, ((imc - min) / (max - min)) * 100))
}
