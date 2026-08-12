"use client"

import { useEffect, useState } from "react"
import { FileText, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ResourceCard } from "@/components/dashboard/ResourceCard"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { analytics } from "@/utils/analytics"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { categoryLabel, mapResource } from "@/lib/fitness-data"
import type { RecursoPDF } from "@/types"

type Categoria = RecursoPDF["categoria"] | "todos"

const categorias: { value: Categoria; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rutinas", label: "Rutinas" },
  { value: "calentamiento", label: "Calentamiento" },
  { value: "movilidad", label: "Movilidad" },
  { value: "cardio", label: "Cardio" },
  { value: "nutricion_basica", label: "Nutrición básica" },
  { value: "recuperacion", label: "Recuperación" },
  { value: "principiantes", label: "Principiantes" },
]

export default function RecursosPage() {
  const [query, setQuery] = useState("")
  const [categoria, setCategoria] = useState<Categoria>("todos")
  const [resources, setResources] = useState<RecursoPDF[]>([])
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    void (async () => {
      const { data } = await supabase
        .from("resources")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (data) {
        setResources(data.map(mapResource))
      }
    })()
  }, [])

  async function handleDownload(recurso: RecursoPDF) {
    if (!recurso.url) {
      setUnavailableIds((prev) => new Set(prev).add(recurso.id))
      return
    }

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.from("user_resource_downloads").insert({ user_id: user.id, resource_id: recurso.id })
    }

    await analytics.pdfDownloaded(recurso.id, recurso.titulo, recurso.categoria)

    const link = document.createElement("a")
    link.href = recurso.url
    link.download = ""
    link.rel = "noopener"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const filtered = resources.filter((r) => {
    const matchesQuery =
      query.trim() === "" ||
      r.titulo.toLowerCase().includes(query.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(query.toLowerCase())
    const matchesCategoria = categoria === "todos" || r.categoria === categoria
    return matchesQuery && matchesCategoria
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Biblioteca"
        subtitle="Material práctico para entrenamiento, técnica y recuperación."
      />

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

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "recurso" : "recursos"} encontrados
        </span>
        {categoria !== "todos" && (
          <Badge variant="secondary" className="text-xs">{categoryLabel(categoria)}</Badge>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const isUnavailable = unavailableIds.has(r.id)
            return (
              <ResourceCard
                key={r.id}
                recurso={{ ...r, disponible: (r.disponible ?? Boolean(r.url)) && !isUnavailable }}
                onDownload={handleDownload}
              />
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="Sin resultados"
          description="No encontramos recursos con esos filtros."
          action={
            <button
              onClick={() => { setQuery(""); setCategoria("todos") }}
              className="text-sm text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          }
        />
      )}
    </div>
  )
}
