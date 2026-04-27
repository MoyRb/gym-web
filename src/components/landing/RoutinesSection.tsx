import Link from "next/link"
import { Calendar, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const routineExamples = [
  {
    emoji: "🏋️",
    titulo: "Full Body Base para Masa (3 días)",
    descripcion: "Fuerza general con progresión simple para principiantes que quieren ganar músculo.",
    dias: 3,
    nivel: "Principiante",
    objetivo: "Ganar masa muscular",
    badge: "Más solicitada",
  },
  {
    emoji: "🔥",
    titulo: "Definición con Fuerza (4 días)",
    descripcion: "Básicos de fuerza + sesiones metabólicas para bajar grasa sin perder rendimiento.",
    dias: 4,
    nivel: "Intermedio",
    objetivo: "Bajar grasa",
    badge: null,
  },
  {
    emoji: "⚡",
    titulo: "Resistencia Progresiva (5 días)",
    descripcion: "Cardio por zonas e intervalos con soporte de fuerza para mejorar capacidad aeróbica.",
    dias: 5,
    nivel: "Intermedio",
    objetivo: "Mejorar resistencia",
    badge: null,
  },
]

export function RoutinesSection() {
  return (
    <section id="rutinas" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Rutinas y materiales reales</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Tu plan inicial se asigna desde un <span className="text-primary">catálogo real</span>
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              FITNESS CLUB recomienda una rutina según objetivo, nivel y días disponibles. Incluye estructura por sesiones,
              ejercicios, series, repeticiones/tiempos, descansos y recomendaciones prácticas para progresar de forma sostenible.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "18 rutinas base orientadas a masa muscular, pérdida de grasa, resistencia y condición general",
                "Asignación automática con fallback claro si no hay coincidencia exacta",
                "Vista completa de la rutina en dashboard para usarla directamente en el gimnasio",
                "Biblioteca con 35 recursos descargables de calentamiento, movilidad, cardio y hábitos",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button className="w-fit gap-2">
                Crear cuenta y ver mi plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {routineExamples.map((r) => (
              <Card key={r.titulo} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4 pt-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                    {r.emoji}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold">{r.titulo}</h3>
                      {r.badge && (
                        <Badge className="shrink-0 text-xs">{r.badge}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{r.descripcion}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="gap-1 text-xs">
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
