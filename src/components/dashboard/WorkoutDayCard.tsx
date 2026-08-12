"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Dumbbell } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ExerciseRow } from "@/components/dashboard/ExerciseRow"
import type { DiaRutina } from "@/types"

interface WorkoutDayCardProps {
  dia: DiaRutina
  index: number
  defaultOpen?: boolean
}

export function WorkoutDayCard({ dia, index, defaultOpen = false }: WorkoutDayCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-0">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{dia.nombre_dia}</span>
              </div>
              <p className="text-xs text-muted-foreground">{dia.enfoque} · {dia.ejercicios.length} ejercicios</p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="mt-4 space-y-2">
          {dia.notas && <p className="text-xs text-muted-foreground mb-3">{dia.notas}</p>}
          {dia.ejercicios.map((exercise, i) => (
            <ExerciseRow key={`${dia.dia}-${exercise.nombre}`} exercise={exercise} index={i} />
          ))}
        </CardContent>
      )}
    </Card>
  )
}
