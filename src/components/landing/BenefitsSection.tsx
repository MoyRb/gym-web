import { Brain, BarChart3, Play, Target, Layers, TrendingUp } from "lucide-react"

const benefits = [
  {
    icon: Brain,
    title: "Rutinas generadas por IA",
    description:
      "Tu plan se construye a partir de tu objetivo, nivel de experiencia y frecuencia de entrenamiento. No es una plantilla genérica.",
  },
  {
    icon: Play,
    title: "Guía visual por ejercicio",
    description:
      "Cada ejercicio incluye demostración visual con la técnica correcta para que entrenes con seguridad y precisión.",
  },
  {
    icon: BarChart3,
    title: "Progreso medible",
    description:
      "Registra series, repeticiones y peso en cada sesión. Visualiza tu volumen semanal y evolución en el tiempo.",
  },
  {
    icon: Target,
    title: "Adaptado a tu objetivo",
    description:
      "Hipertrofia, pérdida de grasa, resistencia o condición general. Tu plan refleja exactamente lo que buscas.",
  },
  {
    icon: Layers,
    title: "Catálogo de ejercicios",
    description:
      "Explora una biblioteca completa de ejercicios organizados por zona muscular y equipamiento disponible.",
  },
  {
    icon: TrendingUp,
    title: "Seguimiento de adherencia",
    description:
      "Lleva un registro de tus sesiones completadas, racha semanal y métricas corporales a lo largo del tiempo.",
  },
]

export function BenefitsSection() {
  return (
    <section className="py-20 sm:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Funcionalidades
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesitas para entrenar bien
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => {
            const Icon = b.icon
            return (
              <div key={b.title} className="flex flex-col gap-4 rounded-lg border border-border bg-background p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1.5 font-semibold">{b.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {b.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
