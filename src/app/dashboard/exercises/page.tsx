import Link from "next/link"
import { ListChecks } from "lucide-react"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { EmptyState } from "@/components/dashboard/EmptyState"

const filterChips = [
  { label: "Músculo", options: ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Core"] },
  { label: "Equipamiento", options: ["Barra", "Mancuernas", "Máquina", "Peso corporal"] },
  { label: "Dificultad", options: ["Principiante", "Intermedio", "Avanzado"] },
]

export default function ExercisesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ejercicios"
        subtitle="Busca y filtra ejercicios por músculo y equipamiento."
      />

      {/* Disabled search */}
      <div className="relative max-w-sm">
        <ListChecks className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar ejercicios..."
          disabled
          className="h-10 w-full rounded-lg border border-border bg-muted pl-9 pr-4 text-sm text-muted-foreground cursor-not-allowed opacity-60"
        />
      </div>

      {/* Visual filter chips */}
      <div className="flex flex-col gap-3">
        {filterChips.map((group) => (
          <div key={group.label} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">{group.label}</span>
            {group.options.map((opt) => (
              <button
                key={opt}
                disabled
                className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-60 cursor-not-allowed"
              >
                {opt}
              </button>
            ))}
          </div>
        ))}
      </div>

      <EmptyState
        icon={ListChecks}
        title="Catálogo próximamente"
        description="El catálogo de ejercicios está en construcción. Tu rutina personalizada ya incluye los ejercicios que necesitas."
        action={
          <Link
            href="/dashboard/rutina"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            Ver mi rutina
          </Link>
        }
      />
    </div>
  )
}
