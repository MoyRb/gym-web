import type { ImcResult } from "@/types"

export function calcularIMC(peso_kg: number, altura_cm: number): ImcResult {
  const alturaM = altura_cm / 100
  const imc = peso_kg / (alturaM * alturaM)
  const value = Math.round(imc * 10) / 10

  if (value < 18.5) {
    return {
      value,
      categoria: "Bajo peso",
      descripcion: "Tu peso está por debajo del rango saludable. Considera un plan enfocado en ganar masa muscular con supervisión.",
      color: "text-blue-500",
    }
  } else if (value < 25) {
    return {
      value,
      categoria: "Peso normal",
      descripcion: "¡Excelente! Estás en un rango de peso saludable. Mantén tus hábitos y optimiza tu rendimiento.",
      color: "text-green-500",
    }
  } else if (value < 30) {
    return {
      value,
      categoria: "Sobrepeso",
      descripcion: "Estás ligeramente por encima del rango saludable. Un plan combinado de fuerza y cardio te ayudará a alcanzar tu peso ideal.",
      color: "text-yellow-500",
    }
  } else if (value < 35) {
    return {
      value,
      categoria: "Obesidad grado I",
      descripcion: "Te recomendamos un plan enfocado en pérdida de grasa con progresión gradual y control nutricional.",
      color: "text-orange-500",
    }
  } else {
    return {
      value,
      categoria: "Obesidad grado II+",
      descripcion: "Es importante consultar con un profesional de la salud antes de iniciar un programa intensivo de ejercicio.",
      color: "text-red-500",
    }
  }
}

export function getImcBarWidth(imc: number): number {
  const min = 15
  const max = 40
  return Math.min(100, Math.max(0, ((imc - min) / (max - min)) * 100))
}
