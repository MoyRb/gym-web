import { UserPlus, Sparkles, Dumbbell } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Crea tu cuenta",
    description:
      "Regístrate en segundos. Completa tu objetivo, nivel de experiencia y días disponibles para entrenar.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Tu IA genera tu plan",
    description:
      "El sistema analiza tu perfil y construye un plan de entrenamiento personalizado con ejercicios seleccionados para ti.",
  },
  {
    number: "03",
    icon: Dumbbell,
    title: "Entrena con guía",
    description:
      "Sigue cada sesión con demostraciones visuales, registra tus series y observa tu progreso en el tiempo.",
  },
]

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Proceso
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Cómo funciona
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Tres pasos para pasar de crear una cuenta a entrenar con un plan diseñado para ti.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.number} className="relative flex flex-col gap-5">
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-1rem)] bg-border sm:block" />
                )}

                <div className="flex items-center gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <span className="text-5xl font-bold text-border/40 tabular leading-none">
                    {step.number}
                  </span>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
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
