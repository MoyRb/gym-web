import Link from "next/link"
import { Calendar, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const routineExamples = [
  {
    emoji: "💪",
    titulo: "Hipertrofia – Principiante",
    descripcion: "3 días/semana. Movimientos compuestos básicos para construir tu base muscular.",
    dias: 3,
    nivel: "Principiante",
    objetivo: "Ganar músculo",
    badge: "Más elegida",
    badgeVariant: "default" as const,
  },
  {
    emoji: "🔥",
    titulo: "Quema de Grasa – 4 Días",
    descripcion: "4 días/semana. Circuitos y HIIT para maximizar la pérdida de grasa.",
    dias: 4,
    nivel: "Intermedio",
    objetivo: "Bajar grasa",
    badge: null,
    badgeVariant: "secondary" as const,
  },
  {
    emoji: "⚡",
    titulo: "Resistencia Funcional – 5 Días",
    descripcion: "5 días/semana. Cardio, funcional y fuerza-resistencia para atletas.",
    dias: 5,
    nivel: "Intermedio",
    objetivo: "Resistencia",
    badge: null,
    badgeVariant: "secondary" as const,
  },
]

export function RoutinesSection() {
  return (
    <section id="rutinas" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left copy */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Rutinas</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Un plan diseñado para ti, <br />
                <span className="text-primary">no para todos</span>
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Según tu objetivo, nivel de experiencia y días disponibles, el sistema te recomienda la rutina más adecuada. Nada genérico — todo adaptado.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Rutinas para ganar masa muscular, bajar grasa o mejorar resistencia",
                "Adaptadas a principiantes, intermedios y avanzados",
                "Con descripción de ejercicios, series, reps y tiempos de descanso",
                "Se actualizan a medida que avanzas",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button className="w-fit gap-2">
                Ver mis rutinas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Right cards */}
          <div className="flex flex-col gap-4">
            {routineExamples.map((r) => (
              <Card key={r.titulo} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4 pt-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl shrink-0">
                    {r.emoji}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{r.titulo}</h3>
                      {r.badge && (
                        <Badge className="shrink-0 text-xs">{r.badge}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.descripcion}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs gap-1">
                        <Calendar className="h-3 w-3" />
                        {r.dias} días/sem
                      </Badge>
                      <Badge variant="secondary" className="text-xs">{r.nivel}</Badge>
                      <Badge variant="outline" className="text-xs">{r.objetivo}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
