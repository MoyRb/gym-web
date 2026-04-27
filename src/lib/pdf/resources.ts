import type { ResourceCategory } from "@/types/database"
import { PDF_RESOURCES_BY_SLUG } from "./resources-data"
import type { PdfResourceContent } from "./types"

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

export function getPdfResourceBySlug(slug: string): PdfResourceContent | null {
  return PDF_RESOURCES_BY_SLUG.get(slug) ?? null
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
    objective: "Entregar una guía útil y segura aunque el contenido detallado esté en actualización.",
    sections: [
      {
        heading: "Resumen del recurso",
        body: [
          input.description,
          "Este documento se genera en tiempo real desde la aplicación para evitar versionar binarios en el repositorio.",
        ],
        checklist: [
          "Revisa el objetivo de la sesión antes de aplicar recomendaciones.",
          "Prioriza técnica, seguridad y progresión gradual.",
        ],
      },
    ],
    recommendations: [
      "Si necesitas personalización, adapta volumen e intensidad a tu experiencia.",
      "Consulta al equipo FITNESS CLUB para una versión específica de este recurso.",
    ],
  }
}
