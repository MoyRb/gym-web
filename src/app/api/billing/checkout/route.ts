import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { stripeProPriceId } from "@/lib/stripe/env"
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer"
import { accountHasVerifiedRealEmail } from "@/lib/auth/username"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import { siteConfig } from "@/config/site"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for the Alpha Trainer Pro subscription.
 *
 * Security:
 *  - userId comes ONLY from the authenticated server session.
 *  - priceId comes ONLY from STRIPE_PRO_MONTHLY_PRICE_ID env var.
 *  - email confirmed at is verified server-side.
 *  - Duplicate subscriptions are blocked.
 *  - No user-supplied redirect URLs are accepted.
 */
export async function POST(): Promise<Response> {
  // 1. Authenticate — userId comes from session only
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 2. Require verified real email — legacy accounts cannot purchase
  if (!accountHasVerifiedRealEmail(user)) {
    return Response.json(
      {
        code: "email_not_verified",
        error: "Debes verificar tu correo electrónico antes de suscribirte.",
      },
      { status: 403 },
    )
  }

  const service = createServiceRoleClient()

  // 3. Block duplicate Stripe subscriptions — fail closed on DB error
  const { data: existingSub, error: subLookupError } = await service
    .from("billing_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due"])
    .maybeSingle()

  if (subLookupError) {
    // DB error must not be treated as "no subscription" — fail safely
    console.error("[POST /api/billing/checkout] DB error checking subscription:", subLookupError.code)
    return Response.json(
      { error: "Error interno. Intenta de nuevo." },
      { status: 500 },
    )
  }

  if (existingSub) {
    return Response.json({ code: "already_subscribed" }, { status: 200 })
  }

  try {
    // 4. Get or create Stripe Customer (never accept from browser)
    const stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email!)

    // 5. Determine base URL — localhost in development, production URL in prod
    const baseUrl =
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : siteConfig.url

    // 6. Create Stripe Checkout Session
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          // priceId comes EXCLUSIVELY from env — never from the request body
          price: stripeProPriceId(),
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
      },
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
    })

    // 7. Track event (non-blocking, no PII)
    void trackServerEvent({
      name: EVENTS.CHECKOUT_STARTED,
      userId: user.id,
      metadata: {},
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error("[POST /api/billing/checkout]", err instanceof Error ? err.message : err)
    return Response.json(
      { error: "No se pudo iniciar el proceso de pago. Intenta de nuevo." },
      { status: 500 },
    )
  }
}
