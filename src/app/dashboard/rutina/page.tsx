"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Target, Dumbbell, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { normalizeRoutineData } from "@/lib/routine-catalog"
import type { Rutina } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getExperienciaLabel, getObjetivoLabel } from "@/utils/routines"

export default function RutinaPage() {
  const [routine, setRoutine] = useState<Rutina | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from("routine_recommendations")
        .select("routine_data")
        .eq("user_id", user.id)
        .maybeSingle()

      const routineRow = data as { routine_data?: unknown } | null
      if (routineRow?.routine_data) {
        setRoutine(normalizeRoutineData(routineRow.routine_data))
      }
    })()
  }, [])

  const weeklySchedule = useMemo(() => {
    if (!routine) return []

    return routine.dias.map((day, index) => ({
      id: day.dia,
      label: day.nombre_dia,
      focus: day.enfoque,
      exerciseCount: day.ejercicios.length,
      order: index + 1,
    }))
  }, [routine])

  if (!routine) {
    return <div className="py-24 text-center text-muted-foreground">Aún no tienes una rutina asignada.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tu rutina completa</h1>
          <p className="text-sm text-muted-foreground">Plan estructurado para seguir semana a semana en el gimnasio.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{routine.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{routine.short_description}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary"><Target className="mr-1 h-3 w-3" />{getObjetivoLabel(routine.objetivo)}</Badge>
            <Badge variant="outline">{getExperienciaLabel(routine.experiencia)}</Badge>
            <Badge variant="outline"><Calendar className="mr-1 h-3 w-3" />{routine.dias_por_semana} días/semana</Badge>
            <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{routine.duracion_semanas} semanas</Badge>
            <Badge variant="outline">~{routine.estimated_session_minutes} min/sesión</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {routine.focus_areas.map((focus) => (
              <Badge key={focus} variant="secondary" className="text-xs">{focus}</Badge>
            ))}
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="mb-3 text-sm font-semibold">Estructura semanal</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {weeklySchedule.map((day) => (
                <div key={day.id} className="rounded-lg border bg-background p-3">
                  <p className="text-xs font-medium text-primary">Sesión {day.order}</p>
                  <p className="text-sm font-semibold">{day.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{day.focus}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{day.exerciseCount} ejercicios</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {routine.dias.map((day) => (
              <Card key={day.dia} className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base"><Dumbbell className="h-4 w-4 text-primary" />{day.nombre_dia}</CardTitle>
                  <p className="text-sm text-muted-foreground">{day.enfoque}</p>
                  {day.notas && <p className="text-xs text-muted-foreground">{day.notas}</p>}
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.ejercicios.map((exercise) => (
                    <div key={`${day.dia}-${exercise.nombre}`} className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">{exercise.nombre}</p>
                      <p className="text-muted-foreground">{exercise.series} series · {exercise.repeticiones} · descanso {exercise.descanso}</p>
                      {exercise.notas && <p className="mt-1 text-xs text-muted-foreground">{exercise.notas}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {(routine.recomendaciones_generales?.length ?? 0) > 0 && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <h3 className="mb-2 text-sm font-semibold">Recomendaciones generales</h3>
              <ul className="space-y-1 pl-0 text-sm text-muted-foreground">
                {routine.recomendaciones_generales?.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
