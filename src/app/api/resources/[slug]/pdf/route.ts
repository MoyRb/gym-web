import { renderToBuffer } from "@react-pdf/renderer"
import { PDF_RESOURCE_AUDIT_BY_SLUG } from "@/lib/pdf/resources-data"
import { buildFallbackPdfResource, inferResourceCategoryFromSlug, resolvePdfResourceBySlug } from "@/lib/pdf/resources"
import { createFitnessClubPdfDocument } from "@/lib/pdf/template"

export const runtime = "nodejs"

type Params = { slug: string }

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params

  if (!slug) {
    return new Response("Recurso inválido", { status: 400 })
  }

  const resolution = resolvePdfResourceBySlug(slug)
  const foundResource = resolution.resource
  const resource =
    foundResource ??
    buildFallbackPdfResource({
      slug,
      title: slug.replaceAll("-", " ").replace(/\\b\\w/g, (char) => char.toUpperCase()),
      description: "Guía dinámica de FITNESS CLUB con estructura accionable para entrenar con criterio.",
      category: inferResourceCategoryFromSlug(slug),
    })

  if (process.env.NODE_ENV !== "production") {
    if (!foundResource) {
      console.warn(`[pdf] fallback | solicitado="${slug}" normalizado="${resolution.normalizedSlug}"`) 
    } else {
      const audit = PDF_RESOURCE_AUDIT_BY_SLUG.get(foundResource.slug)
      if (audit?.builder === "routine-pdf-builder") {
        console.info(`[pdf] builder específico | solicitado="${slug}" canonico="${foundResource.slug}" via="${resolution.via}"`) 
      } else {
        console.info(`[pdf] builder general | solicitado="${slug}" canonico="${foundResource.slug}" via="${resolution.via}"`) 
      }
    }
  }

  const buffer = await renderToBuffer(createFitnessClubPdfDocument(resource))
  const requestUrl = new URL(request.url)
  const shouldDownload = requestUrl.searchParams.get("download") !== "0"

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename=\"${slug}.pdf\"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  })
}

export async function HEAD(request: Request, { params }: { params: Promise<Params> }) {
  const response = await GET(request, { params })
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  })
}
