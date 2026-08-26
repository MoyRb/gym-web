import type { Metadata } from "next"
import Link from "next/link"
import { Check, Sparkles, Lock } from "lucide-react"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import { createClient } from "@/lib/supabase/server"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes de Alpha Trainer. Rutinas manuales ilimitadas gratis. Generación con IA disponible desde el plan gratuito.",
  alternates: { canonical: `${siteConfig.url}/pricing` },
}

const FREE_FEATURES = [
  "Rutinas manuales ilimitadas",
  "Seguimiento de entrenamientos ilimitado",
  "Series, reps, peso y descansos",
  "Historial y progreso básico",
  "Catálogo completo de ejercicios",
  "GIFs de ejercicios",
  "Share Cards",
  "Selección Gym / Casa / Ambos",
  "1 rutina con IA cada 7 días",
]

const FREE_CAVEATS = [
  "Con anuncios (próximamente)",
]

const PRO_FEATURES = [
  "Todo lo del plan Free",
  "Más generaciones con IA (uso ampliado)",
  "Sin anuncios",
  "Progreso avanzado (próximamente)",
  "Funciones premium de IA (próximamente)",
]

export default async function PricingPage() {
  // Track view (non-blocking)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  void trackServerEvent({
    name: EVENTS.PRICING_VIEWED,
    userId: user?.id ?? null,
    metadata: {},
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Planes
            </h1>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Entrena a tu manera. Rutinas manuales ilimitadas para todos. IA para quien quiera más.
            </p>
          </div>

          {/* Cards */}
          <div className="grid gap-8 sm:grid-cols-2 items-start">
            {/* FREE */}
            <div className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Free
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-muted-foreground text-sm">MXN / mes</span>
                </div>
              </div>

              <Link
                href="/register"
                className="flex h-11 items-center justify-center rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
              >
                Comenzar gratis
              </Link>

              <div className="flex flex-col gap-2.5">
                {FREE_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
                {FREE_CAVEATS.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="h-4 w-4 shrink-0 mt-0.5 text-center text-xs">·</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PRO */}
            <div className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col gap-6 relative overflow-hidden">
              {/* Popular badge */}
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                  <Sparkles className="h-3 w-3" />
                  Más completo
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Pro
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">$99</span>
                  <span className="text-muted-foreground text-sm">MXN / mes</span>
                </div>
              </div>

              {/* CTA — disabled until Stripe */}
              <div className="flex flex-col gap-2">
                <button
                  disabled
                  className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary/40 text-primary-foreground text-sm font-semibold cursor-not-allowed opacity-60"
                >
                  <Lock className="h-4 w-4" />
                  Próximamente
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  Los pagos aún no están disponibles.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-16 border-t border-border pt-12">
            <h2 className="text-lg font-bold mb-6 text-center">Preguntas frecuentes</h2>
            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
              <div>
                <p className="text-sm font-semibold mb-1">¿Cuándo se renueva la cuota de IA?</p>
                <p className="text-sm text-muted-foreground">
                  La cuota es una ventana deslizante de 7 días desde tu última generación completada, no un reset calendario.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">¿Puedo crear rutinas sin IA?</p>
                <p className="text-sm text-muted-foreground">
                  Sí. Las rutinas manuales son ilimitadas en todos los planes. La IA es adicional.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">¿Los intentos fallidos consumen cuota?</p>
                <p className="text-sm text-muted-foreground">
                  No. Solo las generaciones completadas con éxito descuentan de tu cuota.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">¿Cuándo estará disponible Pro?</p>
                <p className="text-muted-foreground text-sm">
                  Próximamente. Puedes usar Alpha Trainer gratis desde ahora.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
