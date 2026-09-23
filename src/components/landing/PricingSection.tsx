import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const freeTier = [
  "Rutinas manuales ilimitadas",
  "Seguimiento de entrenamientos ilimitado",
  "Catálogo completo de ejercicios",
  "Guías visuales (GIFs)",
  "Progreso básico",
  "Share Cards",
  "1 rutina con IA cada 7 días",
]

const proTier = [
  "Todo lo del plan Free",
  "20 rutinas con IA cada 30 días",
  "Sin anuncios",
  "Progreso avanzado (próximamente)",
]

// Exported for testing
export const LANDING_FREE_CTA_HREF = "/register"
export const LANDING_PRO_CTA_HREF = "/pricing"

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
            Rutinas manuales ilimitadas en todos los planes. Potencia tu entrenamiento con IA y sin distracciones con Pro.
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

            <Link href={LANDING_FREE_CTA_HREF}>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Comenzar gratis
              </Button>
            </Link>
          </div>

          {/* Pro card */}
          <div className="flex flex-col rounded-lg border-2 border-primary bg-card p-7 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" />
                Más completo
              </span>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">Pro</p>
              {/* Show best-value price to anchor the offer */}
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-muted-foreground line-through">$99</span>
                <span className="text-4xl font-bold tabular">~$74.92</span>
                <span className="text-sm text-muted-foreground">MXN / mes</span>
              </div>
              <p className="mt-1 text-xs text-primary font-medium">
                Pagando anual · desde $99/mes
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                $99/mes · $499 / 6 meses · $899 / año
              </p>
            </div>

            <ul className="mb-8 flex flex-col gap-3 flex-1">
              {proTier.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <Link href={LANDING_PRO_CTA_HREF}>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Ver planes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
