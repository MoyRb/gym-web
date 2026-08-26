import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle, Clock, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserEntitlements } from "@/lib/entitlements/get-entitlements"

export const metadata: Metadata = {
  title: "Pago recibido",
  robots: { index: false, follow: false },
}

/**
 * /billing/success
 *
 * Shown after a Stripe Checkout redirect.
 *
 * IMPORTANT: This page NEVER grants Pro access.
 * It reads the REAL entitlement state from the database — which is only
 * updated by the Stripe webhook. If the webhook has not yet processed,
 * the page shows a "processing" state.
 *
 * The session_id query param may be used for UX context but is NEVER
 * sufficient to modify user_access or grant any entitlement.
 */
export default async function BillingSuccessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Read real entitlements from DB — set by the Stripe webhook, not this page
  const entitlements = await getUserEntitlements(user.id)
  const isPro = entitlements.plan === "pro" || entitlements.plan === "founder"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        {isPro ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-2">Alpha Trainer Pro activo</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Tu suscripción está activa. Disfruta todas las funciones Pro.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Clock className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold mb-2">Pago recibido</h1>
            <p className="text-sm text-muted-foreground mb-2">
              Estamos activando Alpha Trainer Pro en tu cuenta.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Esto normalmente tarda unos segundos. Recarga la página si no ves el cambio.
            </p>
          </>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ir al dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/perfil"
            className="flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            Ver mi perfil
          </Link>
        </div>
      </div>
    </div>
  )
}
