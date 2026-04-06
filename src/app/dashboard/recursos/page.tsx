"use client"

import { useState } from "react"
import { FileText, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ResourceCard } from "@/components/dashboard/ResourceCard"
import { mockRecursos } from "@/data/mock-data"
import { analytics } from "@/utils/analytics"
import { cn } from "@/lib/utils"
import type { RecursoPDF } from "@/types"

type Categoria = RecursoPDF["categoria"] | "todos"

const categorias: { value: Categoria; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "entrenamiento", label: "Entrenamiento" },
  { value: "nutricion", label: "Nutrición" },
  { value: "recuperacion", label: "Recuperación" },
  { value: "motivacion", label: "Motivación" },
]

export default function RecursosPage() {
  const [query, setQuery] = useState("")
  const [categoria, setCategoria] = useState<Categoria>("todos")

  function handleDownload(recurso: RecursoPDF) {
    analytics.pdfDownloaded(recurso.id, recurso.titulo)
  }

  const filtered = mockRecursos.filter((r) => {
    const matchesQuery =
      query.trim() === "" ||
      r.titulo.toLowerCase().includes(query.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(query.toLowerCase())
    const matchesCategoria = categoria === "todos" || r.categoria === categoria
    return matchesQuery && matchesCategoria
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Recursos</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Guías y materiales creados por expertos para acelerar tus resultados.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Buscar recursos..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoria(c.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                categoria === c.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "recurso" : "recursos"} encontrados
        </span>
        {categoria !== "todos" && (
          <Badge variant="secondary" className="text-xs">{categorias.find((c) => c.value === categoria)?.label}</Badge>
        )}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <ResourceCard key={r.id} recurso={r} onDownload={handleDownload} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="font-semibold">Sin resultados</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No encontramos recursos que coincidan con tu búsqueda.
            </p>
          </div>
          <button
            onClick={() => { setQuery(""); setCategoria("todos") }}
            className="text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}
