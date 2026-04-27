import type { ResourceCategory } from "@/types/database"
import { PDF_RESOURCES_BY_SLUG } from "./resources-data"
import type { PdfResourceContent } from "./types"

const RESOURCE_SLUG_ALIASES: Record<string, string> = {
  "activacion-previa-para-dia-de-pierna": "activacion-dia-de-pierna",
  "activacion-de-hombro-y-escapulas": "activacion-hombro-escapulas",
  "intervalos-controlados-en-bicicleta": "intervalos-controlados-bicicleta",
  "optimiza-tu-sueno-y-recuperacion": "sueno-y-rendimiento-fisico",
  "guia-inicial-primer-mes-gimnasio": "guia-inicio-4-semanas",
}

export function slugifyResourceTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function buildResourcePdfUrl(slug: string) {
  return `/api/resources/${encodeURIComponent(slug)}/pdf`
}

export function normalizeResourceSlug(slug: string) {
  return slug
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function getPdfResourceBySlug(slug: string): PdfResourceContent | null {
  const normalizedSlug = normalizeResourceSlug(decodeURIComponent(slug))
  const canonicalSlug = RESOURCE_SLUG_ALIASES[normalizedSlug] ?? normalizedSlug
  return PDF_RESOURCES_BY_SLUG.get(canonicalSlug) ?? null
}

export function inferResourceCategoryFromSlug(slug: string): ResourceCategory {
  const normalized = normalizeResourceSlug(slug)
  if (/calentamiento|warmup|activacion|aproximacion/.test(normalized)) return "calentamiento"
  if (/movilidad/.test(normalized)) return "movilidad"
  if (/cardio|intervalos|caminata|rpe/.test(normalized)) return "cardio"
  if (/nutricion|proteina|colaciones|hidratacion|comidas/.test(normalized)) return "nutricion_basica"
  if (/recuperacion|sueno|fatiga|deload/.test(normalized)) return "recuperacion"
  if (/inicio|primer|errores|maquinas|peso-correctamente|progresion/.test(normalized)) return "principiantes"
  if (/rutina|fullbody|torso|pierna|ppl|entrenamiento/.test(normalized)) return "rutinas"
  return "entrenamiento"
}

export function buildFallbackPdfResource(input: {
  slug: string
  title: string
  description: string
  category: ResourceCategory
}): PdfResourceContent {
  return {
    slug: input.slug,
    title: input.title,
    category: input.category,
    description: input.description,
    objective: "Entregar una guía práctica y accionable aunque el recurso no exista aún en el catálogo principal.",
    sections: [
      {
        heading: "Cómo usar este recurso temporal",
        body: [
          "Define una meta semanal concreta (ejemplo: completar 3 sesiones con técnica estable).",
          "Selecciona 2-3 acciones aplicables hoy y ejecútalas durante 7 días antes de modificar el plan.",
        ],
        checklist: [
          "Registra cumplimiento diario (sí/no).",
          "Anota energía y recuperación al terminar cada sesión.",
          "Ajusta solo una variable por semana: volumen, intensidad o frecuencia.",
        ],
      },
      {
        heading: "Plantilla rápida de progreso",
        body: [
          "Día 1-2: establece línea base de cargas, tiempos o repeticiones.",
          "Día 3-5: mantén ejecución y busca mejoras pequeñas (1-2 repeticiones o mejor técnica).",
          "Día 6-7: revisa resultados y define el siguiente micro-objetivo.",
        ],
      },
    ],
    recommendations: [
      "Prioriza la constancia semanal sobre cambios radicales.",
      "Mantén una técnica segura y progresión gradual.",
      "Detén el ejercicio si aparece dolor agudo o pérdida de control.",
    ],
  }
}
