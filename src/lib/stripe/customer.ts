import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getStripe } from "./server"

/**
 * Resolves or creates a Stripe Customer for the given Supabase user.
 *
 * - Looks up billing_customers for an existing stripe_customer_id.
 * - If not found, creates a new Stripe Customer and stores the mapping.
 * - Metadata includes only supabase_user_id — no fitness/health data.
 *
 * Returns the Stripe customer ID (cus_...).
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const service = createServiceRoleClient()

  // Check for existing mapping
  const { data: existing } = await service
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id
  }

  // Create a new Stripe Customer
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })

  // Persist the mapping
  await service.from("billing_customers").insert({
    user_id: userId,
    stripe_customer_id: customer.id,
  })

  return customer.id
}
