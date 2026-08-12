import { Badge } from "@/components/ui/badge"
import type { Ejercicio } from "@/types"

interface ExerciseRowProps {
  exercise: Ejercicio
  index: number
}

export function ExerciseRow({ exercise, index }: ExerciseRowProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {index + 1}
        </span>
        <div className="flex flex-1 flex-col gap-1.5">
          <p className="font-medium leading-snug">{exercise.nombre}</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">{exercise.series} series</Badge>
            <Badge variant="outline" className="text-xs">{exercise.repeticiones}</Badge>
            <Badge variant="outline" className="text-xs">descanso {exercise.descanso}</Badge>
          </div>
          {exercise.notas && (
            <p className="text-xs text-muted-foreground">{exercise.notas}</p>
          )}
        </div>
      </div>
    </div>
  )
}
