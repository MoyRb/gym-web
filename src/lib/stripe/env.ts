import "server-only"

/**
 * Server-only Stripe environment helpers.
 * These values must NEVER be exposed to the browser.
 * Do NOT use NEXT_PUBLIC_ prefix for any Stripe secret.
 */

export function stripeSecretKey(): string {
  const value = process.env.STRIPE_SECRET_KEY
  if (!value) throw new Error("Missing required environment variable: STRIPE_SECRET_KEY")
  return value
}

export function stripeWebhookSecret(): string {
  const value = process.env.STRIPE_WEBHOOK_SECRET
  if (!value) throw new Error("Missing required environment variable: STRIPE_WEBHOOK_SECRET")
  return value
}

export function stripeProPriceId(): string {
  const value = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  if (!value) throw new Error("Missing required environment variable: STRIPE_PRO_MONTHLY_PRICE_ID")
  return value
}
