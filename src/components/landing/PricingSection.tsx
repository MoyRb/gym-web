import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const freeTier = [
  "Rutina personalizada con IA",
  "Catálogo de ejercicios con guía visual",
  "Seguimiento de sesiones y series",
  "Progreso y métricas básicas",
  "Perfil de entrenamiento",
]

export function PricingSection() {
  return (
    <section id="precios" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Precios
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Empieza gratis
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Accede a las funcionalidades principales sin costo. Planes avanzados próximamente.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Free card */}
          <div className="flex flex-col rounded-lg border border-border bg-card p-7">
            <div className="mb-6">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">Gratis</p>
              <p className="text-4xl font-bold tabular">$0</p>
              <p className="mt-1 text-sm text-muted-foreground">Para siempre</p>
            </div>

            <ul className="mb-8 flex flex-col gap-3 flex-1">
              {freeTier.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Link href="/register">
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Comenzar gratis
              </Button>
            </Link>
          </div>

          {/* Pro placeholder */}
          <div className="flex flex-col rounded-lg border border-border bg-card p-7 relative overflow-hidden">
            {/* Coming soon overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-[2px] z-10">
              <span className="rounded border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Próximamente
              </span>
            </div>

            {/* Background content (blurred) */}
            <div className="mb-6 opacity-30">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">Pro</p>
              <p className="text-4xl font-bold tabular">—</p>
              <p className="mt-1 text-sm text-muted-foreground">Por mes</p>
            </div>

            <ul className="mb-8 flex flex-col gap-3 flex-1 opacity-30">
              {["Todo lo del plan Gratis", "Funcionalidades avanzadas", "Analítica detallada", "Soporte prioritario"].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Button variant="outline" className="w-full opacity-30" disabled>
              Disponible pronto
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
