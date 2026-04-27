import type { PdfResourceContent } from "./types"
import { buildGeneralPdfResource } from "./builders/general-pdf-builder"
import { buildRoutinePdfResource } from "./builders/routine-pdf-builder"
import { RESOURCE_SEEDS } from "./resources-content/base-resources"

export const PDF_RESOURCES: PdfResourceContent[] = RESOURCE_SEEDS.map((seed) => {
  if (seed.category === "rutinas") {
    return buildRoutinePdfResource(seed) ?? buildGeneralPdfResource(seed)
  }

  return buildGeneralPdfResource(seed)
})

export const PDF_RESOURCES_BY_SLUG = new Map(PDF_RESOURCES.map((resource) => [resource.slug, resource]))
