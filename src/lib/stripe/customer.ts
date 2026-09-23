import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getStripe } from "./server"

/**
 * Resolves or creates a Stripe Customer for the given Supabase user.
 *
 * Filters by (user_id, livemode) so the same user can have both a Test customer
 * and a Live customer simultaneously, without cross-contamination.
 *
 * - Looks up billing_customers for an existing mapping in the current Stripe mode.
 * - If not found, creates a new Stripe Customer and stores the mapping.
 * - Metadata includes only supabase_user_id — no fitness/health data.
 *
 * Concurrency: two simultaneous checkout requests may race to create a Customer.
 * The UNIQUE(user_id, livemode) constraint resolves the race. On a 23505 conflict
 * we retry the lookup and return the winner's customer ID.
 *
 * Throws on any DB or Stripe error — callers must propagate this as a 5xx.
 *
 * Returns the Stripe customer ID (cus_...).
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  livemode: boolean,
): Promise<string> {
  const service = createServiceRoleClient()

  // Check for existing mapping in the current Stripe mode
  const { data: existing, error: lookupError } = await service
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .eq("livemode", livemode)
    .maybeSingle()

  if (lookupError) {
    throw new Error(
      `[getOrCreateStripeCustomer] DB error looking up billing_customers for user=${userId} livemode=${livemode}: ${lookupError.code}`,
    )
  }

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id
  }

  // Create a new Stripe Customer in the current mode
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })

  // Persist the mapping
  const { error: insertError } = await service.from("billing_customers").insert({
    user_id: userId,
    stripe_customer_id: customer.id,
    livemode,
  })

  if (!insertError) {
    return customer.id
  }

  if (insertError.code === "23505") {
    // Concurrent request already created the mapping — fetch the winner's customer ID.
    // The Stripe Customer we just created is orphaned; acceptable for V1
    // (one extra cus_ object in Stripe, no duplicate charges possible).
    const { data: winner, error: retryError } = await service
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("livemode", livemode)
      .maybeSingle()

    if (retryError || !winner?.stripe_customer_id) {
      throw new Error(
        `[getOrCreateStripeCustomer] Concurrent creation conflict and retry failed for user=${userId} livemode=${livemode}: ${retryError?.code ?? "no_row"}`,
      )
    }

    return winner.stripe_customer_id
  }

  throw new Error(
    `[getOrCreateStripeCustomer] Failed to persist billing_customers for user=${userId} livemode=${livemode}: ${insertError.code}`,
  )
}
