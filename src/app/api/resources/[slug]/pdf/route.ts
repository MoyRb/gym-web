import { renderToBuffer } from "@react-pdf/renderer"
import { buildFallbackPdfResource, getPdfResourceBySlug } from "@/lib/pdf/resources"
import { createFitnessClubPdfDocument } from "@/lib/pdf/template"

export const runtime = "nodejs"

type Params = { slug: string }

export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { slug } = await params

  if (!slug) {
    return new Response("Recurso inválido", { status: 400 })
  }

  const resource =
    getPdfResourceBySlug(slug) ??
    buildFallbackPdfResource({
      slug,
      title: slug.replaceAll("-", " ").replace(/\\b\\w/g, (char) => char.toUpperCase()),
      description: "Guía dinámica de FITNESS CLUB con estructura accionable para entrenar con criterio.",
      category: "rutinas",
    })

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
