"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { calcularIMC, getImcBarWidth } from "@/utils/imc"
import { cn } from "@/lib/utils"
import { Activity } from "lucide-react"

interface ImcCardProps {
  peso_kg: number
  altura_cm: number
}

export function ImcCard({ peso_kg, altura_cm }: ImcCardProps) {
  const result = calcularIMC(peso_kg, altura_cm)
  const barWidth = getImcBarWidth(result.value)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Índice de Masa Corporal
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* IMC value */}
        <div className="flex items-end gap-3">
          <span className={cn("text-5xl font-black", result.color)}>{result.value}</span>
          <div className="mb-1 flex flex-col">
            <Badge
              variant="outline"
              className={cn("w-fit border-current/30 bg-current/5 font-medium", result.color)}
            >
              {result.categoria}
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-2">
          <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-500">
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/80 rounded-full shadow-sm transition-all duration-700"
              style={{ left: `${barWidth}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Bajo peso</span>
            <span>Normal</span>
            <span>Sobrepeso</span>
            <span>Obesidad</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">{result.descripcion}</p>

        {/* Data points */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Peso</span>
            <span className="font-semibold">{peso_kg} kg</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Altura</span>
            <span className="font-semibold">{altura_cm} cm</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
