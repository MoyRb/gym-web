import { getStripe } from "@/lib/stripe/server"
import { stripeWebhookSecret } from "@/lib/stripe/env"
import { syncStripeSubscription } from "@/lib/stripe/sync"
import { processReferralCommission } from "@/lib/referral/commission"
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
 *  - All entitlement logic (granting / revoking Pro) happens in syncStripeSubscription().
 *  - Commission logic (referral_commissions) happens in processReferralCommission().
 *
 * Ordering guarantee:
 *  - Phase 1: Subscription sync (entitlement-critical). Errors → 5xx → Stripe retries.
 *  - Phase 2: Referral commission (financial, best-effort). Errors are logged but
 *    NEVER fail the webhook response — entitlement must not depend on commission.
 *
 * Idempotency (billing_webhook_events):
 *  - On arrival: INSERT with status='processing'. Conflict (23505) → check existing status.
 *  - status='processed' → true duplicate → return 200 without re-processing.
 *  - status='processing'|'failed' → eligible for retry → proceed.
 *  - On sync success: UPDATE status='processed', processed_at=now().
 *  - On sync failure: UPDATE status='failed' → return HTTP 500 so Stripe retries.
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

  const service = createServiceRoleClient()

  // 3. Idempotency — claim this event for processing.
  //    Returns false only when the event was already successfully processed.
  const shouldProcess = await claimEvent(service, event.id, event.type as string, event.livemode)
  if (!shouldProcess) {
    return Response.json({ received: true, duplicate: true })
  }

  // ── Phase 1: Subscription sync (entitlement-critical) ──────────────────────
  // Errors here MUST propagate as 5xx so Stripe retries until entitlement is correct.
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
    const errorCode = err instanceof Error ? err.message.slice(0, 200) : "sync_error"
    console.error(
      "[stripe/webhook] Sync failed for event",
      event.id,
      event.type,
      err instanceof Error ? err.message : err,
    )

    await service
      .from("billing_webhook_events")
      .update({
        status: "failed",
        last_error_code: errorCode,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", event.id)

    // Return 5xx so Stripe retries until sync succeeds
    return Response.json({ error: "Sync failed, will retry" }, { status: 500 })
  }

  // ── Phase 2: Referral commission (best-effort, never fails webhook) ──────────
  // Commission errors are logged but do NOT affect the entitlement or the 200 response.
  // The stripe_invoice_id UNIQUE constraint ensures idempotency on retries.
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice
    try {
      await processReferralCommission(invoice)

      // Track referral converted (non-blocking) if commission was created
      // Note: processReferralCommission returns void; conversion is inferred by no error
    } catch (err) {
      console.error(
        "[stripe/webhook] Commission processing failed for invoice",
        (event.data.object as Stripe.Invoice).id,
        err instanceof Error ? err.message : err,
      )
      // Do NOT re-throw — commission failure must not fail the webhook
    }
  }

  // ── Mark as successfully processed ────────────────────────────────────────
  await service
    .from("billing_webhook_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", event.id)

  console.log("[stripe/webhook] Processed event", event.id, event.type)
  return Response.json({ received: true })
}

/**
 * Attempts to claim a webhook event for processing.
 *
 * Returns true when this handler should process the event.
 * Returns false when the event was already successfully processed (true duplicate).
 *
 * Concurrency: two simultaneous deliveries of the same event may both proceed
 * to sync. This is safe because syncStripeSubscription is fully idempotent.
 */
async function claimEvent(
  service: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  eventType: string,
  livemode: boolean,
): Promise<boolean> {
  const { error: insertError } = await service.from("billing_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    livemode,
    status: "processing",
    processed_at: null,
  })

  if (!insertError) {
    return true
  }

  if (insertError.code !== "23505") {
    console.error(
      "[stripe/webhook] Could not record event (non-conflict error):",
      insertError.code,
      eventId,
    )
    return true
  }

  // Unique constraint conflict: event already exists. Check its status.
  const { data: existing, error: selectError } = await service
    .from("billing_webhook_events")
    .select("status")
    .eq("stripe_event_id", eventId)
    .maybeSingle()

  if (selectError) {
    console.error(
      "[stripe/webhook] Could not read event status:",
      selectError.code,
      eventId,
    )
    return true
  }

  if (existing?.status === "processed") {
    console.log("[stripe/webhook] Duplicate (already processed):", eventId)
    return false
  }

  console.log("[stripe/webhook] Retrying event (status:", existing?.status, "):", eventId)
  return true
}

/**
 * Extracts the subscription ID from a Stripe event, handling each event type.
 * Returns null for event types that don't carry a subscription.
 */
function extractSubscriptionId(event: Stripe.Event): string | null {
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
