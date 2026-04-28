import type { PdfResourceContent } from "./types"
import { buildGeneralPdfResource } from "./builders/general-pdf-builder"
import { buildRoutinePdfResource, hasRoutineSnapshot } from "./builders/routine-pdf-builder"
import { RESOURCE_SEEDS } from "./resources-content/base-resources"
import { hasSpecificGeneralContent } from "./builders/general-pdf-builder"

export type PdfBuilderName = "routine-pdf-builder" | "general-pdf-builder"

export type AuditedPdfResource = {
  slug: string
  title: string
  category: string
  builder: PdfBuilderName
  source: "routine-snapshot" | "specific-general"
  usesRoutineCatalog: boolean
  usesBaseContent: boolean
  usesFallback: boolean
  content: PdfResourceContent
}

export const PDF_RESOURCES_AUDIT: AuditedPdfResource[] = RESOURCE_SEEDS.map((seed) => {
  const routineResource = seed.category === "rutinas" ? buildRoutinePdfResource(seed) : null
  const content = routineResource ?? buildGeneralPdfResource(seed)

  return {
    slug: seed.slug,
    title: seed.title,
    category: seed.category,
    builder: routineResource ? "routine-pdf-builder" : "general-pdf-builder",
    source: routineResource ? "routine-snapshot" : "specific-general",
    usesRoutineCatalog: seed.category === "rutinas" && hasRoutineSnapshot(seed.slug),
    usesBaseContent: !routineResource && !hasSpecificGeneralContent(seed.slug),
    usesFallback: false,
    content,
  }
})

export const PDF_RESOURCES: PdfResourceContent[] = PDF_RESOURCES_AUDIT.map((item) => item.content)

export const PDF_RESOURCES_BY_SLUG = new Map(PDF_RESOURCES.map((resource) => [resource.slug, resource]))

export const PDF_RESOURCE_AUDIT_BY_SLUG = new Map(PDF_RESOURCES_AUDIT.map((resource) => [resource.slug, resource]))
