import { UserPlus, ClipboardList, Dumbbell, BookOpen, TrendingUp } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Te registras",
    description: "Creas tu cuenta y accedes a tu dashboard personal en minutos.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Completas tu perfil",
    description: "Nos indicas objetivo, nivel y días disponibles para entrenar.",
  },
  {
    number: "03",
    icon: Dumbbell,
    title: "Recibes tu rutina",
    description: "Asignamos una rutina base del catálogo que mejor encaja con tu perfil.",
  },
  {
    number: "04",
    icon: BookOpen,
    title: "Consultas material",
    description: "Descargas recursos de apoyo (calentamiento, movilidad, cardio y nutrición básica).",
  },
  {
    number: "05",
    icon: TrendingUp,
    title: "Das seguimiento",
    description: "Entrenas, revisas tu progreso y ajustas tu perfil cuando cambian tus objetivos.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 sm:py-28 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Proceso real</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo funciona FITNESS CLUB</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Un flujo claro para empezar bien desde la primera semana.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Icon className="h-7 w-7" />
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-primary text-xs font-bold text-primary">
                    {i + 1}
                  </div>
                </div>
                <div className="text-5xl font-black text-primary/10 leading-none mb-2">{step.number}</div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
