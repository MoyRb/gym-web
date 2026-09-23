import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { resolvePriceIdForPeriod, isLiveMode } from "@/lib/stripe/env"
import { isBillingPeriod } from "@/lib/stripe/billing-periods"
import type { BillingPeriod } from "@/lib/stripe/billing-periods"
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer"
import { accountHasVerifiedRealEmail } from "@/lib/auth/username"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import { siteConfig } from "@/config/site"
import { getReferralCode } from "@/lib/referral/cookie"
import { getActivePartnerByCode } from "@/lib/referral/partner"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for the selected Alpha Trainer Pro plan.
 *
 * Security:
 *  - userId comes ONLY from the authenticated server session.
 *  - billingPeriod is whitelisted server-side: only "monthly", "semiannual", "annual" accepted.
 *  - priceId is resolved server-side from env — never accepted from the browser.
 *  - email confirmed at is verified server-side.
 *  - Duplicate subscriptions are blocked (filtered by livemode).
 *  - referral partner is validated server-side from HttpOnly cookie.
 *  - No user-supplied redirect URLs, priceIds, userIds, or partnerIds accepted.
 *
 * Request body: { billingPeriod: "monthly" | "semiannual" | "annual" }
 */
export async function POST(request: Request): Promise<Response> {
  // 1. Parse and validate billingPeriod — whitelist only
  let billingPeriod: BillingPeriod
  try {
    const body = (await request.json()) as Record<string, unknown>
    const raw = body.billingPeriod
    if (!isBillingPeriod(raw)) {
      return Response.json({ error: "billingPeriod inválido." }, { status: 400 })
    }
    billingPeriod = raw
  } catch {
    return Response.json({ error: "Request inválido." }, { status: 400 })
  }

  // 2. Authenticate — userId comes from session only
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  // 3. Require verified real email — legacy accounts cannot purchase
  if (!accountHasVerifiedRealEmail(user)) {
    return Response.json(
      {
        code: "email_not_verified",
        error: "Debes verificar tu correo electrónico antes de suscribirte.",
      },
      { status: 403 },
    )
  }

  const livemode = isLiveMode()
  const service = createServiceRoleClient()

  // 4. Block duplicate Stripe subscriptions — filtered by livemode to prevent
  //    Sandbox subs from blocking Live checkout and vice versa
  const { data: existingSub, error: subLookupError } = await service
    .from("billing_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .eq("livemode", livemode)
    .in("status", ["active", "trialing", "past_due"])
    .maybeSingle()

  if (subLookupError) {
    console.error("[POST /api/billing/checkout] DB error checking subscription:", subLookupError.code)
    return Response.json({ error: "Error interno. Intenta de nuevo." }, { status: 500 })
  }

  if (existingSub) {
    return Response.json({ code: "already_subscribed" }, { status: 200 })
  }

  // 5. Resolve Price ID for selected period — throws if env var missing → 503
  let priceId: string
  try {
    priceId = resolvePriceIdForPeriod(billingPeriod)
  } catch {
    return Response.json(
      { error: "Este período de facturación no está disponible todavía." },
      { status: 503 },
    )
  }

  // 6. Resolve referral partner from HttpOnly cookie (server-side only)
  //    Never accept gym_partner_id from the request body.
  let gymPartnerId: string | null = null
  try {
    const referralCode = await getReferralCode()
    if (referralCode) {
      const partner = await getActivePartnerByCode(referralCode)
      gymPartnerId = partner?.id ?? null
    }
  } catch {
    // Referral lookup failure must NOT block checkout
    gymPartnerId = null
  }

  try {
    // 7. Get or create Stripe Customer in current mode (never accept from browser)
    const stripeCustomerId = await getOrCreateStripeCustomer(user.id, user.email!, livemode)

    // 8. Determine base URL
    const baseUrl =
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : siteConfig.url

    // 9. Build metadata — no PII, only internal IDs
    const sessionMetadata: Record<string, string> = {
      user_id: user.id,
      billing_period: billingPeriod,
    }
    if (gymPartnerId) {
      sessionMetadata.gym_partner_id = gymPartnerId
    }

    // 10. Create Stripe Checkout Session
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          // priceId comes EXCLUSIVELY from env — never from the request body
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: user.id,
      metadata: sessionMetadata,
      subscription_data: {
        // Propagate metadata to the subscription object so the webhook
        // and commission processor can read gym_partner_id and billing_period.
        metadata: sessionMetadata,
      },
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
    })

    // 11. Track events (non-blocking, no PII)
    void trackServerEvent({
      name: EVENTS.CHECKOUT_STARTED,
      userId: user.id,
      metadata: { billing_period: billingPeriod },
    })
    if (gymPartnerId) {
      void trackServerEvent({
        name: EVENTS.REFERRAL_CHECKOUT_STARTED,
        userId: user.id,
        metadata: { billing_period: billingPeriod },
      })
    }

    return Response.json({ url: session.url })
  } catch (err) {
    console.error("[POST /api/billing/checkout]", err instanceof Error ? err.message : err)
    return Response.json(
      { error: "No se pudo iniciar el proceso de pago. Intenta de nuevo." },
      { status: 500 },
    )
  }
}
