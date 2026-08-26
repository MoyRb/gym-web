import "server-only"
import Stripe from "stripe"
import { stripeSecretKey } from "./env"

let _stripe: Stripe | null = null

/**
 * Returns the singleton Stripe client.
 * Uses server-only secret key — never exposed to the browser.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(stripeSecretKey())
  }
  return _stripe
}
