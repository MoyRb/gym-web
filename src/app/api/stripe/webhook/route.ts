import { getStripe } from "@/lib/stripe/server"
import { stripeWebhookSecret } from "@/lib/stripe/env"
import { syncStripeSubscription } from "@/lib/stripe/sync"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"
import type Stripe from "stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * POST /api/stripe/webhook
 *
 * Receives and processes Stripe webhook events.
 *
 * Authentication: Stripe HMAC signature (STRIPE_WEBHOOK_SECRET).
 * This endpoint does NOT require Supabase authentication.
 *
 * Security:
 *  - Raw body must be used for signature verification — never re-parse as JSON first.
 *  - Invalid signature → HTTP 400.
 *  - All business logic (granting / revoking Pro) happens in syncStripeSubscription().
 *  - Idempotency enforced via billing_webhook_events (unique stripe_event_id).
 *
 * Supported events:
 *  checkout.session.completed
 *  customer.subscription.created
 *  customer.subscription.updated
 *  customer.subscription.deleted
 *  invoice.paid
 *  invoice.payment_failed
 */
export async function POST(request: Request): Promise<Response> {
  // 1. Read raw body — MUST happen before any other processing
  const rawBody = await request.text()
  const sig = request.headers.get("stripe-signature") ?? ""

  // 2. Verify Stripe signature
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, stripeWebhookSecret())
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature"
    console.error("[stripe/webhook] Signature verification failed:", msg)
    return Response.json({ error: "Invalid signature" }, { status: 400 })
  }

  // 3. Idempotency — skip already-processed events
  const service = createServiceRoleClient()
  try {
    const { error: insertError } = await service.from("billing_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type as string,
    })

    if (insertError) {
      if (insertError.code === "23505") {
        // Duplicate event — already processed. Return 200 so Stripe stops retrying.
        return Response.json({ received: true, duplicate: true })
      }
      // Unexpected DB error — log but don't block processing
      console.error("[stripe/webhook] Could not record event:", insertError.code)
    }
  } catch {
    // Non-fatal — continue processing even if idempotency record fails
  }

  // 4. Dispatch to subscription sync
  try {
    const subscriptionId = extractSubscriptionId(event)

    if (subscriptionId) {
      await syncStripeSubscription(subscriptionId)

      // Track checkout_completed when the checkout session finalizes
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.client_reference_id) {
          void trackServerEvent({
            name: EVENTS.CHECKOUT_COMPLETED,
            userId: session.client_reference_id,
            metadata: {},
          })
        }
      }
    }
  } catch (err) {
    // Sync errors are logged but return 200 to prevent Stripe from retrying
    // indefinitely for transient errors. Monitor via server logs.
    console.error("[stripe/webhook] Sync error for event", event.id, event.type, err)
  }

  return Response.json({ received: true })
}

/**
 * Extracts the subscription ID from a Stripe event, handling each event type.
 * Returns null for event types that don't carry a subscription.
 */
function extractSubscriptionId(event: Stripe.Event): string | null {
  // Use unknown cast first (safer than Record<string, unknown> which conflicts
  // with some Stripe types that lack an index signature)
  const obj = event.data.object as unknown as { id?: unknown; subscription?: unknown }

  switch (event.type) {
    case "checkout.session.completed": {
      const subscription = obj.subscription
      if (typeof subscription === "string") return subscription
      return null
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const id = obj.id
      if (typeof id === "string") return id
      return null
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscription = obj.subscription
      if (typeof subscription === "string") return subscription
      return null
    }

    default:
      return null
  }
}
