import "server-only"
import type { BillingPeriod } from "./billing-periods"

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

/**
 * Whether Stripe is running in Live mode.
 *
 * Set STRIPE_LIVE_MODE=true only for Production (Live keys).
 * Preview and Development always use Sandbox (STRIPE_LIVE_MODE omitted or "false").
 *
 * Also validates key-prefix consistency to catch misconfiguration early:
 *   STRIPE_LIVE_MODE=true  + sk_test_ → config error (would silently charge nothing)
 *   STRIPE_LIVE_MODE=false + sk_live_ → config error (would charge real money in preview)
 *
 * The key value is never logged.
 */
export function isLiveMode(): boolean {
  const flag = process.env.STRIPE_LIVE_MODE
  const live = flag === "true"

  const key = process.env.STRIPE_SECRET_KEY ?? ""
  if (live && key.startsWith("sk_test_")) {
    throw new Error(
      "[Stripe config] STRIPE_LIVE_MODE=true but STRIPE_SECRET_KEY is a test key. " +
        "Production requires sk_live_.",
    )
  }
  if (!live && key.startsWith("sk_live_")) {
    throw new Error(
      "[Stripe config] STRIPE_LIVE_MODE=false but STRIPE_SECRET_KEY is a live key. " +
        "Set STRIPE_LIVE_MODE=true for production.",
    )
  }

  return live
}

/** Maps a billing period to its corresponding env var name. */
function priceEnvVarName(period: BillingPeriod): string {
  switch (period) {
    case "monthly":
      return "STRIPE_PRO_MONTHLY_PRICE_ID"
    case "semiannual":
      return "STRIPE_PRO_SEMIANNUAL_PRICE_ID"
    case "annual":
      return "STRIPE_PRO_ANNUAL_PRICE_ID"
  }
}

/**
 * Resolves the Stripe Price ID for the given billing period from env.
 * Throws if the env var is not set.
 * Checkout MUST fail closed if the selected price is not configured.
 */
export function resolvePriceIdForPeriod(period: BillingPeriod): string {
  const varName = priceEnvVarName(period)
  const value = process.env[varName]
  if (!value) throw new Error(`Missing required environment variable: ${varName}`)
  return value
}

/**
 * Resolves a BillingPeriod from a Stripe Price ID.
 * Returns null if the price ID matches none of the configured prices.
 *
 * CRITICAL: An unknown price NEVER grants Pro access.
 * Only prices explicitly set in env vars are recognized.
 */
export function resolveBillingPeriodFromStripePrice(priceId: string): BillingPeriod | null {
  const monthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  const semiannual = process.env.STRIPE_PRO_SEMIANNUAL_PRICE_ID
  const annual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID

  if (monthly && priceId === monthly) return "monthly"
  if (semiannual && priceId === semiannual) return "semiannual"
  if (annual && priceId === annual) return "annual"

  return null
}

/**
 * @deprecated Use resolvePriceIdForPeriod("monthly") instead.
 * Kept for backward compatibility — will be removed once all callers are updated.
 */
export function stripeProPriceId(): string {
  return resolvePriceIdForPeriod("monthly")
}
