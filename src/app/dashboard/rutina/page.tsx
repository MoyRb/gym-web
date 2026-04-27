"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, Target, Dumbbell } from "lucide-react"
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

  if (!routine) {
    return <div className="py-24 text-center text-muted-foreground">Aún no tienes una rutina asignada.</div>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tu rutina completa</h1>
          <p className="text-sm text-muted-foreground">Plan estructurado para seguir semana a semana.</p>
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
            <Badge variant="secondary"><Target className="h-3 w-3 mr-1" />{getObjetivoLabel(routine.objetivo)}</Badge>
            <Badge variant="outline">{getExperienciaLabel(routine.experiencia)}</Badge>
            <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" />{routine.dias_por_semana} días/semana</Badge>
            <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{routine.duracion_semanas} semanas</Badge>
            <Badge variant="outline">~{routine.estimated_session_minutes} min/sesión</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {routine.focus_areas.map((focus) => (
              <Badge key={focus} variant="secondary" className="text-xs">{focus}</Badge>
            ))}
          </div>

          <div className="grid gap-4">
            {routine.dias.map((day) => (
              <Card key={day.dia} className="border-border/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><Dumbbell className="h-4 w-4 text-primary" />{day.nombre_dia}</CardTitle>
                  <p className="text-sm text-muted-foreground">{day.enfoque}</p>
                  {day.notas && <p className="text-xs text-muted-foreground">{day.notas}</p>}
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.ejercicios.map((exercise) => (
                    <div key={`${day.dia}-${exercise.nombre}`} className="rounded-lg border bg-muted/20 p-3 text-sm">
                      <p className="font-medium">{exercise.nombre}</p>
                      <p className="text-muted-foreground">{exercise.series} series · {exercise.repeticiones} · descanso {exercise.descanso}</p>
                      {exercise.notas && <p className="text-xs text-muted-foreground mt-1">{exercise.notas}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {(routine.recomendaciones_generales?.length ?? 0) > 0 && (
            <div className="rounded-xl border bg-muted/30 p-4">
              <h3 className="font-semibold text-sm mb-2">Recomendaciones generales</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {routine.recomendaciones_generales?.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
