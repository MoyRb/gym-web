import { Target, BarChart3, BookOpen, Zap, Shield, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const benefits = [
  {
    icon: Target,
    title: "Rutinas a tu medida",
    description: "Planes adaptados a tu objetivo, nivel y disponibilidad. Diseñados por entrenadores del gimnasio.",
  },
  {
    icon: BarChart3,
    title: "Seguimiento de tu IMC",
    description: "Calcula y monitorea tu índice de masa corporal con interpretación clara y recomendaciones iniciales.",
  },
  {
    icon: BookOpen,
    title: "Material descargable",
    description: "Guías en PDF de nutrición, técnica y recuperación para reforzar tus hábitos fuera del gym.",
  },
  {
    icon: Zap,
    title: "Resultados reales",
    description: "Con un plan estructurado y constancia, avanzas semana a semana sin improvisar.",
  },
  {
    icon: Shield,
    title: "Entrenamiento seguro",
    description: "Rutinas sugeridas según tu experiencia para minimizar el riesgo de lesión.",
  },
  {
    icon: Users,
    title: "Comunidad FITNESS CLUB",
    description: "Entrena acompañado de una comunidad local enfocada en salud, constancia y progreso.",
  },
]

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Por qué elegirnos</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Un gimnasio real con apoyo digital útil</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            FITNESS CLUB combina entrenamiento presencial con una plataforma simple para ayudarte a sostener tu proceso.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => {
            const Icon = b.icon
            return (
              <Card key={b.title} className="group transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{b.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
