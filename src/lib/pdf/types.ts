import type { RecursoCategoria } from "@/types"

export interface PdfSection {
  heading: string
  body: string[]
  checklist?: string[]
}

export interface PdfResourceContent {
  slug: string
  title: string
  category: RecursoCategoria
  description: string
  objective: string
  sections: PdfSection[]
  recommendations: string[]
}
