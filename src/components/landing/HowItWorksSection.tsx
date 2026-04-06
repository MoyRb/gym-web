import { UserPlus, ClipboardList, Dumbbell, TrendingUp } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Crea tu cuenta",
    description: "Regístrate con tu nombre de usuario. Solo necesitas unos minutos para empezar.",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Completa tu perfil físico",
    description: "Dinos tu objetivo, experiencia, medidas y días disponibles para entrenar.",
  },
  {
    number: "03",
    icon: Dumbbell,
    title: "Recibe tu rutina",
    description: "El sistema te asigna la rutina más adecuada según tu perfil. Lista para empezar.",
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Entrena y progresa",
    description: "Sigue tu plan, descarga material de apoyo y actualiza tu perfil con el tiempo.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 sm:py-28 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Proceso</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo funciona</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            En cuatro pasos simples tendrás acceso a todo lo que FITNESS CLUB tiene para ti.
          </p>
        </div>

        <div className="relative">
          <div className="absolute top-16 left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>
    </section>
  )
}
