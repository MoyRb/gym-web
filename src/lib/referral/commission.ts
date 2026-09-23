import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getStripe } from "@/lib/stripe/server"
import { resolveBillingPeriodFromStripePrice } from "@/lib/stripe/env"
import { BILLING_PERIOD_COMMISSION_GROUP } from "@/lib/stripe/billing-periods"
import type Stripe from "stripe"

/**
 * Processes a referral commission for the FIRST paid invoice of a subscription.
 *
 * Called from the webhook handler on invoice.paid events.
 * Commission errors are re-thrown so the webhook can log them, but the caller
 * (webhook handler) MUST NOT propagate this to Stripe — entitlement sync
 * (syncStripeSubscription) must always complete independently.
 *
 * Commission is created ONLY when ALL of the following hold:
 *   1. invoice.billing_reason === "subscription_create" (first payment, not renewal)
 *   2. The subscription metadata contains a valid gym_partner_id
 *   3. The partner is currently active
 *   4. No commission exists yet for this stripe_invoice_id (UNIQUE idempotency)
 *   5. No attribution exists yet for this user (first purchase only — UNIQUE user_id)
 *
 * On retry / duplicate event delivery:
 *   - Existing commission detected → ensure attribution also exists → return safely
 *   - Attribution already exists for a different subscription → skip commission
 *
 * Commission basis: invoice.subtotal_excluding_tax (after discounts, before tax).
 *   Falls back to invoice.subtotal if subtotal_excluding_tax is not available.
 * Rounding: Math.floor — rounds down, conservative, in Alpha Trainer's favor.
 *
 * Example (monthly, standard 5000 bps):
 *   9900 cents × 5000 bps / 10000 = 4950 cents ($49.50 MXN)
 */
export async function processReferralCommission(invoice: Stripe.Invoice): Promise<void> {
  // 1. Only process first-payment invoices
  if (invoice.billing_reason !== "subscription_create") {
    return
  }

  // 2. Must have a subscription ID (Stripe v22: subscription lives in parent.subscription_details)
  const rawSub = invoice.parent?.subscription_details?.subscription ?? null
  const subscriptionId =
    typeof rawSub === "string"
      ? rawSub
      : (rawSub as Stripe.Subscription | null)?.id ?? null

  if (!subscriptionId) return

  // 3. Must have a Stripe customer ID (to look up our user)
  const stripeCustomerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : (invoice.customer as Stripe.Customer | null)?.id ?? null

  if (!stripeCustomerId) return

  const stripe = getStripe()
  const service = createServiceRoleClient()

  // 4. Retrieve subscription to get metadata (partner ID + billing period)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const gymPartnerId = subscription.metadata?.gym_partner_id ?? null

  // No referral metadata = organic purchase, no commission
  if (!gymPartnerId) return

  // 5. Resolve billing period from the subscription's current price
  const priceId = subscription.items.data[0]?.price?.id ?? null
  const billingPeriod = resolveBillingPeriodFromStripePrice(priceId ?? "")

  // Unknown price = cannot determine period = no commission
  if (!billingPeriod) return

  // 6. Resolve our user from billing_customers
  const { data: billingCustomer } = await service
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle()

  if (!billingCustomer?.user_id) return

  const userId = billingCustomer.user_id

  // 7. Idempotency: check if commission already exists for this invoice
  const { data: existingCommission } = await service
    .from("referral_commissions")
    .select("id")
    .eq("stripe_invoice_id", invoice.id)
    .maybeSingle()

  if (existingCommission) {
    // Commission already inserted (e.g. prior retry) — ensure attribution also exists
    await service.from("referral_attributions").upsert(
      {
        user_id: userId,
        gym_partner_id: gymPartnerId,
        stripe_subscription_id: subscriptionId,
        billing_period: billingPeriod,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    )
    return
  }

  // 8. First-purchase protection: if user already attributed to any partner, skip
  const { data: existingAttribution } = await service
    .from("referral_attributions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (existingAttribution) return

  // 9. Validate partner is active and get commission rates
  const { data: partner } = await service
    .from("gym_partners")
    .select("id, status, monthly_commission_bps, long_term_commission_bps")
    .eq("id", gymPartnerId)
    .maybeSingle()

  if (!partner || partner.status !== "active") return

  // 10. Calculate commission using integer arithmetic (no floats)
  //
  //     Commission basis: subtotal_excluding_tax (after discounts, before tax).
  //     Falls back to subtotal if unavailable.
  //     Both are in Stripe minor units (integer cents for MXN).
  const basisCents: number = invoice.subtotal_excluding_tax ?? invoice.subtotal

  const commissionGroup = BILLING_PERIOD_COMMISSION_GROUP[billingPeriod]
  // Snapshot bps at time of sale — historical commissions survive future partner edits
  const commissionBps: number =
    commissionGroup === "monthly"
      ? partner.monthly_commission_bps
      : partner.long_term_commission_bps

  // Math.floor → rounds down → conservative (slightly in Alpha Trainer's favor)
  const commissionAmountCents = Math.floor((basisCents * commissionBps) / 10000)

  // 11. Insert commission row — UNIQUE(stripe_invoice_id) = idempotency guard
  const { error: commissionError } = await service.from("referral_commissions").insert({
    gym_partner_id: gymPartnerId,
    user_id: userId,
    stripe_subscription_id: subscriptionId,
    stripe_invoice_id: invoice.id,
    billing_period: billingPeriod,
    commission_bps: commissionBps,
    commission_basis_amount_cents: basisCents,
    commission_amount_cents: commissionAmountCents,
    currency: (invoice.currency ?? "mxn").toLowerCase(),
    status: "pending",
  })

  if (commissionError) {
    if (commissionError.code === "23505") {
      // Race condition on concurrent delivery — already handled by another handler
      return
    }
    throw new Error(
      `[processReferralCommission] Failed to insert commission for invoice=${invoice.id}: ${commissionError.code}`,
    )
  }

  // 12. Record attribution — UNIQUE(user_id) prevents duplicate attributions
  //     ignoreDuplicates: true makes this a safe no-op if already attributed
  await service.from("referral_attributions").upsert(
    {
      user_id: userId,
      gym_partner_id: gymPartnerId,
      stripe_subscription_id: subscriptionId,
      billing_period: billingPeriod,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  )
}

// ── TODO: Refund/dispute handling ────────────────────────────────────────────
//
// When a first invoice is refunded or a chargeback is filed before the partner
// commission is paid, the commission should be transitioned to "void".
//
// Webhook events to handle: charge.refunded, charge.dispute.created
//
// Implementation (not in scope for V1):
//   1. Listen for charge.refunded / charge.dispute.created
//   2. Find the associated invoice via charge.invoice
//   3. Look up referral_commissions by stripe_invoice_id
//   4. If status = "pending" or "approved": UPDATE status = "void", voided_at = now()
//   5. Leave "paid" commissions alone (paid externally — handle manually)
//
// Until this is implemented: keep commissions in "pending" and DO NOT mark them
// "approved" or "paid" without manual review of refund/dispute history.
