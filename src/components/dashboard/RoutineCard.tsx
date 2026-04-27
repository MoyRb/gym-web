"use client"

import { Dumbbell, Clock, Calendar } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { Rutina } from "@/types"
import { getObjetivoLabel, getExperienciaLabel } from "@/utils/routines"

interface RoutineCardProps {
  rutina: Rutina
}

export function RoutineCard({ rutina }: RoutineCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Dumbbell className="h-4 w-4 text-primary" />
              {rutina.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{rutina.short_description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              <Calendar className="mr-1 h-3 w-3" />
              {rutina.dias_por_semana} días/sem
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              {rutina.duracion_semanas} semanas
            </Badge>
            <Badge variant="outline" className="text-xs">
              ~{rutina.estimated_session_minutes} min/sesión
            </Badge>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">{getObjetivoLabel(rutina.objetivo)}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{getExperienciaLabel(rutina.experiencia)}</Badge>
          <Badge variant="outline" className="text-xs">{rutina.level_label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {rutina.dias.length > 0 ? (
          <Tabs defaultValue={rutina.dias[0].dia}>
            <TabsList className="mb-4 h-auto flex-wrap gap-1 bg-transparent p-0">
              {rutina.dias.map((d) => (
                <TabsTrigger key={d.dia} value={d.dia} className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {d.nombre_dia}
                </TabsTrigger>
              ))}
            </TabsList>

            {rutina.dias.map((d) => (
              <TabsContent key={d.dia} value={d.dia}>
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-foreground">{d.enfoque}</h4>
                  {d.notas && <p className="text-xs text-muted-foreground mt-1">{d.notas}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  {d.ejercicios.map((ej, i) => (
                    <div key={`${d.dia}-${ej.nombre}`} className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium">{ej.nombre}</span>
                      </div>
                      <div className="ml-8 flex flex-wrap gap-2 sm:ml-0">
                        <Badge variant="secondary" className="text-xs">{ej.series} series</Badge>
                        <Badge variant="outline" className="text-xs">{ej.repeticiones}</Badge>
                        <Badge variant="ghost" className="text-xs text-muted-foreground">
                          <Clock className="mr-1 h-2.5 w-2.5" />
                          {ej.descanso}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Dumbbell className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay ejercicios definidos</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
