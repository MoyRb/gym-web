import Link from "next/link"
import { ArrowRight, Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Rutina } from "@/types"

interface TodayWorkoutCardProps {
  rutina: Rutina
}

export function TodayWorkoutCard({ rutina }: TodayWorkoutCardProps) {
  // Show today's day (index 0) or the first available day
  const today = rutina.dias[0]

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Dumbbell className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Entrenamiento de hoy
          </span>
        </div>
        <Link
          href="/dashboard/rutina"
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold">{rutina.title}</h2>
          {today && (
            <p className="mt-1 text-sm text-muted-foreground">{today.enfoque}</p>
          )}
        </div>

        {/* Exercise preview */}
        {today && today.ejercicios.length > 0 && (
          <div className="mb-5 flex flex-col gap-2">
            {today.ejercicios.slice(0, 4).map((ej, i) => (
              <div
                key={`${ej.nombre}-${i}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="truncate font-medium">{ej.nombre}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  {ej.series}×{ej.repeticiones}
                </span>
              </div>
            ))}
            {today.ejercicios.length > 4 && (
              <p className="text-xs text-muted-foreground pl-7">
                +{today.ejercicios.length - 4} ejercicios más
              </p>
            )}
          </div>
        )}

        <Link href="/dashboard/rutina">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Ver mi plan completo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
