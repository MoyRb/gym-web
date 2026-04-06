import { Target, BarChart3, BookOpen, Zap, Shield, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const benefits = [
  {
    icon: Target,
    title: "Rutinas a tu medida",
    description: "Planes adaptados a tu objetivo, nivel y disponibilidad. Diseñados por nuestro equipo de entrenadores.",
  },
  {
    icon: BarChart3,
    title: "Seguimiento de tu IMC",
    description: "Calcula y monitorea tu índice de masa corporal con interpretación clara y recomendaciones.",
  },
  {
    icon: BookOpen,
    title: "Material exclusivo",
    description: "Guías de nutrición, técnica y recuperación en PDF, accesibles solo para miembros del club.",
  },
  {
    icon: Zap,
    title: "Resultados visibles",
    description: "Con un plan estructurado y seguimiento constante, los resultados llegan antes de lo que crees.",
  },
  {
    icon: Shield,
    title: "Entrenamiento seguro",
    description: "Cada rutina está diseñada respetando tu nivel actual para minimizar el riesgo de lesiones.",
  },
  {
    icon: Users,
    title: "Comunidad real",
    description: "Forma parte de una comunidad de personas comprometidas con su bienestar en Fitnes Club.",
  },
]

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Por qué elegirnos</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesitas para transformarte
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            En Fitnes Club no solo te damos acceso a una sala — te acompañamos en todo el proceso.
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
                    <h3 className="font-semibold mb-1">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
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
