"use client"

import { useState } from "react"
import Link from "next/link"
import { Sparkles, Crown, ExternalLink } from "lucide-react"
import { BILLING_PERIOD_DISPLAY } from "@/lib/stripe/billing-periods"
import type { BillingPeriod } from "@/lib/stripe/billing-periods"

export type PricingCTAStatus =
  | "anonymous"       // not logged in
  | "unverified"      // logged in, email not confirmed
  | "free"            // verified, free plan
  | "pro_stripe"      // active Stripe Pro subscription
  | "founder"         // non-Stripe privileged access (founder_grant, manual_test, etc.)

interface PricingCTAProps {
  status: PricingCTAStatus
  /** When provided, renders a compact period-specific CTA button */
  billingPeriod?: BillingPeriod
  /** Renders a smaller button variant for use in the period comparison grid */
  compact?: boolean
}

/**
 * Client component for the Pro plan CTA.
 * All actual payment logic is server-side; this component only handles the
 * button interaction and redirect to Stripe-hosted pages.
 *
 * The billingPeriod is sent to POST /api/billing/checkout.
 * The browser NEVER sends a Stripe Price ID — only the period name.
 */
export function PricingCTA({ status, billingPeriod = "monthly", compact = false }: PricingCTAProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodDisplay = BILLING_PERIOD_DISPLAY[billingPeriod]

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // billingPeriod is the only value sent — never a Stripe Price ID
        body: JSON.stringify({ billingPeriod }),
      })
      const data = (await res.json()) as { url?: string; code?: string; error?: string }

      if (data.code === "already_subscribed") {
        await openPortal()
        return
      }

      if (!res.ok || !data.url) {
        setError(data.error ?? "No se pudo iniciar el pago. Intenta de nuevo.")
        return
      }

      window.location.href = data.url
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function openPortal() {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? "No se pudo abrir el portal de facturación.")
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  // ── Static states (no period selection needed) ────────────────────────────

  if (status === "anonymous") {
    return (
      <div className="flex flex-col gap-1">
        <Link
          href="/login?redirect=/pricing"
          className={`flex items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors ${compact ? "h-9 text-xs" : "h-11"}`}
        >
          <Sparkles className="h-4 w-4" />
          {compact ? periodDisplay.ctaLabel : "Mejorar a Pro"}
        </Link>
      </div>
    )
  }

  if (status === "unverified") {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href="/verify-email"
          className={`flex items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors ${compact ? "h-9 text-xs" : "h-11"}`}
        >
          <Sparkles className="h-4 w-4" />
          Verificar correo
        </Link>
        {!compact && (
          <p className="text-center text-xs text-muted-foreground">
            Verifica tu correo para continuar con la suscripción.
          </p>
        )}
      </div>
    )
  }

  if (status === "founder") {
    if (compact) return null
    return (
      <div className="flex flex-col gap-2">
        <div className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 text-sm font-semibold text-primary border border-primary/20">
          <Crown className="h-4 w-4" />
          Acceso Founder activo
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Tienes acceso especial a Alpha Trainer Pro.
        </p>
      </div>
    )
  }

  if (status === "pro_stripe") {
    if (compact) return null
    return (
      <div className="flex flex-col gap-2">
        <div className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 text-sm font-semibold text-primary border border-primary/20">
          <Sparkles className="h-4 w-4" />
          Plan Pro activo
        </div>
        <button
          onClick={() => { setLoading(true); void openPortal() }}
          disabled={loading}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {loading ? "Cargando..." : "Administrar suscripción"}
        </button>
        {error && <p className="text-center text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  // free — upgrade path
  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => { void handleUpgrade() }}
        disabled={loading}
        className={`flex items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${compact ? "h-9 text-xs" : "h-11 text-sm"}`}
      >
        <Sparkles className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {loading ? "Redirigiendo..." : compact ? periodDisplay.ctaLabel : "Mejorar a Pro"}
      </button>
      {error && !compact && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  )
}
