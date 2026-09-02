import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getStripe } from "./server"
import { stripeProPriceId } from "./env"

/**
 * Statuses that grant Alpha Trainer Pro access.
 *
 * - active: subscription is current and paid.
 * - trialing: subscription is in trial period.
 * - past_due: payment failed but Stripe is still retrying — do NOT remove
 *   access immediately; wait for the authoritative terminal state.
 */
const PRO_ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const
type ProActiveStatus = (typeof PRO_ACTIVE_STATUSES)[number]

function isProActive(status: string): status is ProActiveStatus {
  return (PRO_ACTIVE_STATUSES as readonly string[]).includes(status)
}

/**
 * Fetches the authoritative subscription state from Stripe, upserts
 * billing_subscriptions, and projects the entitlement into user_access.
 *
 * This is the SINGLE function that determines whether a Stripe subscription
 * grants or revokes Pro access. All webhook handlers delegate here.
 *
 * Entitlement precedence:
 *   Founder / manual grant (source ≠ "stripe")
 *     > Stripe Pro (source = "stripe")
 *     > Free (no row)
 *
 * The function NEVER downgrades a non-stripe grant when a Stripe subscription
 * is canceled. It ONLY manages rows with source = "stripe".
 *
 * Throws on any DB or Stripe error — callers (webhook handler) must let
 * errors propagate so Stripe retries the event.
 */
export async function syncStripeSubscription(subscriptionId: string): Promise<void> {
  const stripe = getStripe()
  const service = createServiceRoleClient()

  // 1. Fetch authoritative state from Stripe
  const sub = await stripe.subscriptions.retrieve(subscriptionId)

  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id

  // Primary subscription item (contains price and current billing period)
  const firstItem = sub.items.data[0]
  const priceId = firstItem?.price.id ?? null
  const status = sub.status
  // current_period_end is on SubscriptionItem in Stripe API 2026-07-29.dahlia+
  const rawPeriodEnd = firstItem?.current_period_end ?? null
  const currentPeriodEnd = rawPeriodEnd ? new Date(rawPeriodEnd * 1000) : null
  const cancelAtPeriodEnd = sub.cancel_at_period_end

  // 2. Resolve Supabase user from billing_customers
  const { data: billingCustomer, error: customerLookupError } = await service
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle()

  if (customerLookupError) {
    throw new Error(
      `[syncStripeSubscription] DB error looking up billing_customers for stripe_customer_id=${stripeCustomerId}: ${customerLookupError.code}`,
    )
  }

  if (!billingCustomer) {
    // No mapping found — this is an error, not a silent skip.
    // The webhook must return 5xx so Stripe retries.
    throw new Error(
      `[syncStripeSubscription] No billing_customers row for stripe_customer_id=${stripeCustomerId} subscription=${subscriptionId}`,
    )
  }

  const userId = billingCustomer.user_id

  // 3. Upsert billing_subscriptions (always mirror Stripe state)
  const { error: upsertSubError } = await service.from("billing_subscriptions").upsert(
    {
      stripe_subscription_id: subscriptionId,
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: priceId ?? "",
      status,
      current_period_end: currentPeriodEnd?.toISOString() ?? null,
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  )

  if (upsertSubError) {
    throw new Error(
      `[syncStripeSubscription] Failed to upsert billing_subscriptions for subscription=${subscriptionId}: ${upsertSubError.code}`,
    )
  }

  // 4. Determine whether this subscription grants Pro
  const isValidPrice = priceId === stripeProPriceId()
  const grantsProAccess = isProActive(status) && isValidPrice

  if (grantsProAccess) {
    // Check existing user_access to preserve non-stripe grants
    const { data: currentAccess, error: accessReadError } = await service
      .from("user_access")
      .select("source")
      .eq("user_id", userId)
      .maybeSingle()

    if (accessReadError) {
      throw new Error(
        `[syncStripeSubscription] DB error reading user_access for user=${userId}: ${accessReadError.code}`,
      )
    }

    const currentSource = currentAccess?.source ?? null

    // Only upsert when there's no row (free) or the current row is also stripe-managed.
    // Never overwrite founder_grant, manual_test, or similar privileged sources.
    if (currentSource === null || currentSource === "stripe" || currentSource === "default") {
      const { error: upsertAccessError } = await service.from("user_access").upsert(
        {
          user_id: userId,
          plan: "pro",
          source: "stripe",
          valid_until: currentPeriodEnd?.toISOString() ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

      if (upsertAccessError) {
        throw new Error(
          `[syncStripeSubscription] Failed to upsert user_access (grant pro) for user=${userId}: ${upsertAccessError.code}`,
        )
      }
    }
    // Otherwise (founder_grant, manual_test, etc.): leave the existing grant intact.
  } else {
    // Subscription is no longer Pro-granting (canceled, invalid price, etc.)
    // Only revoke if the current user_access was stripe-managed.
    const { data: currentAccess, error: accessReadError } = await service
      .from("user_access")
      .select("source")
      .eq("user_id", userId)
      .maybeSingle()

    if (accessReadError) {
      throw new Error(
        `[syncStripeSubscription] DB error reading user_access for user=${userId}: ${accessReadError.code}`,
      )
    }

    if (currentAccess?.source === "stripe") {
      // Delete the row — no row = free (preserves the default-free invariant)
      const { error: deleteError } = await service
        .from("user_access")
        .delete()
        .eq("user_id", userId)

      if (deleteError) {
        throw new Error(
          `[syncStripeSubscription] Failed to delete user_access (revoke stripe) for user=${userId}: ${deleteError.code}`,
        )
      }
    }
    // Non-stripe grants (founder_grant, manual_test, etc.) are left untouched.
  }
}

/**
 * Cancels all active Stripe subscriptions for the given user.
 * Called BEFORE deleting the auth user to avoid orphaned subscriptions.
 *
 * Returns { success: true } when all subscriptions were canceled or none existed.
 * Returns { success: false, error } if any cancellation fails — the caller
 * MUST NOT proceed with account deletion in this case.
 */
export async function cancelStripeSubscriptionsForUser(
  userId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const service = createServiceRoleClient()

  const { data: activeSubs } = await service
    .from("billing_subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .in("status", [...PRO_ACTIVE_STATUSES])

  if (!activeSubs || activeSubs.length === 0) {
    return { success: true }
  }

  const stripe = getStripe()

  for (const sub of activeSubs) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id)
    } catch (err) {
      console.error(
        "[cancelStripeSubscriptionsForUser] Failed to cancel subscription:",
        sub.stripe_subscription_id,
        err,
      )
      return {
        success: false,
        error:
          "No se pudo cancelar tu suscripción de Stripe. Por favor intenta de nuevo o contacta soporte en hola@alphatrainer.net.",
      }
    }
  }

  return { success: true }
}
