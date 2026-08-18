import { Play, Search, Filter } from "lucide-react"

const exerciseHighlights = [
  { label: "Zona corporal", examples: ["Pecho", "Espalda", "Piernas", "Hombros", "Core"] },
  { label: "Equipamiento", examples: ["Barra", "Mancuernas", "Peso corporal", "Cable", "Máquina"] },
]

export function ExerciseGuidanceSection() {
  return (
    <section id="ejercicios" className="py-20 sm:py-28 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left — visual mockup */}
          <div className="order-2 lg:order-1">
            {/* Exercise card mockup */}
            <div className="rounded-lg border border-border bg-background overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Press banca con barra</span>
              </div>

              {/* Exercise preview */}
              <div className="flex gap-5 p-5">
                {/* GIF placeholder */}
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded bg-primary/10">
                  <Play className="h-8 w-8 text-primary/60" />
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <p className="font-semibold">Press Banca con Barra</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pecho · Barra</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Pectoralis Major</span>
                    <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">Tríceps</span>
                  </div>
                </div>
              </div>

              {/* Instruction steps preview */}
              <div className="border-t border-border p-5 space-y-2">
                {[
                  "Acuéstate en el banco con los pies apoyados en el suelo.",
                  "Agarra la barra con agarre ligeramente más ancho que los hombros.",
                  "Baja controladamente hasta el pecho, empuja explosivamente.",
                ].map((step, i) => (
                  <div key={i} className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/40 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* Filter mockup */}
            <div className="mt-4 rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filtros</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {exerciseHighlights.flatMap((cat) =>
                  cat.examples.map((ex) => (
                    <span
                      key={ex}
                      className="rounded px-2.5 py-1 text-xs border border-border text-muted-foreground"
                    >
                      {ex}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right — text */}
          <div className="order-1 lg:order-2 flex flex-col gap-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
                Guía de ejecución
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Sigue cada ejercicio con demostración visual
              </h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Cada ejercicio en tu plan incluye guía visual del movimiento e
              instrucciones de ejecución paso a paso para que entrenes con la
              técnica correcta desde el inicio.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Catálogo de ejercicios con filtros por zona corporal y equipamiento",
                "Instrucciones de ejecución detalladas",
                "Integrado directamente en tu sesión de entrenamiento",
                "Disponible durante el entrenamiento activo",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
