import type { Metadata } from "next"
import Link from "next/link"
import { Check, Sparkles } from "lucide-react"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { siteConfig } from "@/config/site"
import { getUserEntitlements } from "@/lib/entitlements/get-entitlements"
import { accountHasVerifiedRealEmail } from "@/lib/auth/username"
import { isLiveMode } from "@/lib/stripe/env"
import { BILLING_PERIOD_DISPLAY } from "@/lib/stripe/billing-periods"
import type { BillingPeriod } from "@/lib/stripe/billing-periods"
import { PricingCTA } from "./PricingCTA"
import type { PricingCTAStatus } from "./PricingCTA"

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Alpha Trainer Pro desde $74.92/mes. $99 mensual · $499 cada 6 meses · $899 al año. Rutinas con IA, sin anuncios.",
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
  "Puede incluir publicidad",
]

const PRO_FEATURES = [
  "Todo lo del plan Free",
  "Más generaciones con IA (uso ampliado)",
  "Sin anuncios",
  "Progreso avanzado (próximamente)",
  "Funciones premium de IA (próximamente)",
]

export { FREE_FEATURES, PRO_FEATURES, FREE_CAVEATS }

const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "Mensual",
  semiannual: "6 meses",
  annual: "12 meses",
}

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  void trackServerEvent({
    name: EVENTS.PRICING_VIEWED,
    userId: user?.id ?? null,
    metadata: {},
  })

  let ctaStatus: PricingCTAStatus = "anonymous"

  if (user) {
    const isVerified = accountHasVerifiedRealEmail(user)

    if (!isVerified) {
      ctaStatus = "unverified"
    } else {
      const [entitlements, stripeSubResult] = await Promise.all([
        getUserEntitlements(user.id),
        createServiceRoleClient()
          .from("billing_subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .eq("livemode", isLiveMode())
          .in("status", ["active", "trialing", "past_due"])
          .maybeSingle(),
      ])

      if (entitlements.plan === "founder") {
        ctaStatus = "founder"
      } else if (entitlements.plan === "pro" && stripeSubResult.data) {
        ctaStatus = "pro_stripe"
      } else if (entitlements.plan === "pro") {
        ctaStatus = "founder"
      } else {
        ctaStatus = "free"
      }
    }
  }

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
                  <span className="text-muted-foreground text-sm">MXN</span>
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
              {/* Best value badge */}
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

                {/* Period selector tabs */}
                {ctaStatus === "free" || ctaStatus === "anonymous" || ctaStatus === "unverified" ? (
                  <PricingCTA status={ctaStatus} />
                ) : (
                  <>
                    {/* Existing Pro/Founder users see their current state */}
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-4xl font-extrabold">$99</span>
                      <span className="text-muted-foreground text-sm">MXN / mes</span>
                    </div>
                    <PricingCTA status={ctaStatus} />
                  </>
                )}

                {/* Period picker + price display for upgrade paths */}
                {(ctaStatus === "free" || ctaStatus === "anonymous" || ctaStatus === "unverified") && null}
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

          {/* Period pricing detail — shown for upgrade-eligible users */}
          {(ctaStatus === "free" || ctaStatus === "anonymous" || ctaStatus === "unverified") && (
            <div className="mt-8 rounded-2xl border border-border bg-card overflow-hidden">
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {(["monthly", "semiannual", "annual"] as BillingPeriod[]).map((period) => {
                  const d = BILLING_PERIOD_DISPLAY[period]
                  return (
                    <div
                      key={period}
                      className={`p-6 flex flex-col gap-3 relative ${d.isBestValue ? "bg-primary/5" : ""}`}
                    >
                      {d.isBestValue && (
                        <span className="absolute top-3 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Mejor valor
                        </span>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {BILLING_PERIOD_LABELS[period]}
                      </p>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold">{d.displayPrice}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{d.periodLabel}</p>
                        {d.monthlyEquivalent && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {d.monthlyEquivalent}
                          </p>
                        )}
                        {d.savingsAmount !== null && (
                          <p className="text-xs text-primary font-medium mt-1">
                            Ahorras ${d.savingsAmount} MXN
                          </p>
                        )}
                      </div>
                      <PricingCTA status={ctaStatus} billingPeriod={period} compact />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* FAQ */}
          <div className="mt-16 border-t border-border pt-12">
            <h2 className="text-lg font-bold mb-6 text-center">Preguntas frecuentes</h2>
            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
              <div>
                <p className="text-sm font-semibold mb-1">¿Cuándo se renueva la cuota de IA?</p>
                <p className="text-sm text-muted-foreground">
                  La cuota es una ventana deslizante de 7 días (Free) o 30 días (Pro) desde tu última generación completada, no un reset calendario.
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
                <p className="text-sm font-semibold mb-1">¿Puedo cancelar cuando quiera?</p>
                <p className="text-sm text-muted-foreground">
                  Sí. Puedes cancelar en cualquier momento desde el portal de suscripción. Mantendrás el acceso Pro hasta el final del período pagado.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">¿Cómo administro mi suscripción?</p>
                <p className="text-sm text-muted-foreground">
                  Desde tu perfil en Alpha Trainer accedes al portal de Stripe donde puedes ver, cambiar o cancelar tu suscripción.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">¿Pierdo mis datos si vuelvo a Free?</p>
                <p className="text-sm text-muted-foreground">
                  No. Tus rutinas, sesiones y progreso se conservan siempre, independientemente del plan.
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
