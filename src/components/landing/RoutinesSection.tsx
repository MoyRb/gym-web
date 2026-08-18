import Link from "next/link"
import { ArrowRight, Sparkles, Target, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

const personalizationFactors = [
  {
    icon: Target,
    title: "Tu objetivo",
    options: ["Ganar masa muscular", "Bajar grasa", "Mejorar resistencia", "Condición general"],
  },
  {
    icon: Zap,
    title: "Tu nivel",
    options: ["Principiante", "Intermedio", "Avanzado"],
  },
  {
    icon: Sparkles,
    title: "Tu disponibilidad",
    options: ["2 días/sem", "3 días/sem", "4 días/sem", "5–6 días/sem"],
  },
]

export function RoutinesSection() {
  return (
    <section id="personalizacion" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left — text */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                Personalización IA
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Un plan construido para ti, no para todos
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              La IA combina tu objetivo, nivel de experiencia y días disponibles para
              construir un plan de entrenamiento estructurado por sesiones, con
              ejercicios, series, repeticiones y tiempos de descanso específicos.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Selección inteligente de ejercicios por zona muscular",
                "Progresión adaptada a tu nivel de experiencia",
                "Estructura semanal completa y equilibrada",
                "Posibilidad de regenerar tu plan cuando cambien tus objetivos",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register">
              <Button className="w-fit gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Generar mi plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Right — factors */}
          <div className="flex flex-col gap-4">
            {personalizationFactors.map((factor) => {
              const Icon = factor.icon
              return (
                <div key={factor.title} className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-3 flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{factor.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {factor.options.map((opt) => (
                      <span
                        key={opt}
                        className="rounded px-2.5 py-1 text-xs font-medium border border-border text-muted-foreground"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
