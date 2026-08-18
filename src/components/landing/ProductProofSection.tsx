const proofPoints = [
  { value: "IA", label: "Generación de rutinas" },
  { value: "Guía visual", label: "Por ejercicio" },
  { value: "Progreso", label: "Medido en cada sesión" },
  { value: "Personalizado", label: "Para tu objetivo" },
]

export function ProductProofSection() {
  return (
    <section id="funcionalidades" className="border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {proofPoints.map((item) => (
            <div key={item.label} className="flex flex-col gap-1 text-center">
              <span className="font-heading text-lg font-bold text-primary sm:text-xl tabular">
                {item.value}
              </span>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
