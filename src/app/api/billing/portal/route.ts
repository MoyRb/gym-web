import "server-only"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import { siteConfig } from "@/config/site"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the authenticated user.
 *
 * Security:
 *  - stripe_customer_id is resolved from the server session — never from the browser.
 *  - return_url is hardcoded server-side — no open redirect.
 */
export async function POST(): Promise<Response> {
  // 1. Authenticate
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Resolve stripe_customer_id from our mapping — never accept from browser
  const service = createServiceRoleClient()
  const { data: billingCustomer } = await service
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!billingCustomer?.stripe_customer_id) {
    return Response.json(
      { error: "No se encontró una cuenta de facturación." },
      { status: 404 },
    )
  }

  try {
    // 3. Hardcoded return URL — not supplied by the browser
    const baseUrl =
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : siteConfig.url

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/perfil`,
    })

    // 4. Track event (non-blocking)
    void trackServerEvent({
      name: EVENTS.BILLING_PORTAL_OPENED,
      userId: user.id,
      metadata: {},
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error("[POST /api/billing/portal]", err instanceof Error ? err.message : err)
    return Response.json(
      { error: "No se pudo abrir el portal de facturación. Intenta de nuevo." },
      { status: 500 },
    )
  }
}
