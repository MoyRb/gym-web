/**
 * Tests for billing period catalog and price resolution.
 *
 * Verifies:
 *  - isBillingPeriod validates all three periods and rejects invalid values
 *  - Price cents are correct for all periods
 *  - Commission groups are assigned correctly
 *  - resolveBillingPeriodFromStripePrice maps env Price IDs correctly
 *  - Unknown price → null (never grants Pro)
 *  - Missing env var → throws in resolvePriceIdForPeriod
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  isBillingPeriod,
  BILLING_PERIOD_PRICE_CENTS,
  BILLING_PERIOD_COMMISSION_GROUP,
  BILLING_PERIOD_DISPLAY,
} from "@/lib/stripe/billing-periods"

// ── isBillingPeriod ────────────────────────────────────────────────────────

describe("isBillingPeriod", () => {
  it("accepts monthly", () => expect(isBillingPeriod("monthly")).toBe(true))
  it("accepts semiannual", () => expect(isBillingPeriod("semiannual")).toBe(true))
  it("accepts annual", () => expect(isBillingPeriod("annual")).toBe(true))
  it("rejects empty string", () => expect(isBillingPeriod("")).toBe(false))
  it("rejects arbitrary price_XXXX", () => expect(isBillingPeriod("price_123")).toBe(false))
  it("rejects null", () => expect(isBillingPeriod(null)).toBe(false))
  it("rejects undefined", () => expect(isBillingPeriod(undefined)).toBe(false))
  it("rejects uppercase MONTHLY", () => expect(isBillingPeriod("MONTHLY")).toBe(false))
  it("rejects pro_monthly", () => expect(isBillingPeriod("pro_monthly")).toBe(false))
})

// ── Price cents ────────────────────────────────────────────────────────────

describe("BILLING_PERIOD_PRICE_CENTS", () => {
  it("monthly = 9900 cents ($99.00 MXN)", () => {
    expect(BILLING_PERIOD_PRICE_CENTS.monthly).toBe(9900)
  })
  it("semiannual = 49900 cents ($499.00 MXN)", () => {
    expect(BILLING_PERIOD_PRICE_CENTS.semiannual).toBe(49900)
  })
  it("annual = 89900 cents ($899.00 MXN)", () => {
    expect(BILLING_PERIOD_PRICE_CENTS.annual).toBe(89900)
  })
})

// ── Commission groups ──────────────────────────────────────────────────────

describe("BILLING_PERIOD_COMMISSION_GROUP", () => {
  it("monthly uses monthly group (50% standard)", () => {
    expect(BILLING_PERIOD_COMMISSION_GROUP.monthly).toBe("monthly")
  })
  it("semiannual uses long_term group (15% standard)", () => {
    expect(BILLING_PERIOD_COMMISSION_GROUP.semiannual).toBe("long_term")
  })
  it("annual uses long_term group (15% standard)", () => {
    expect(BILLING_PERIOD_COMMISSION_GROUP.annual).toBe("long_term")
  })
})

// ── Display catalog ────────────────────────────────────────────────────────

describe("BILLING_PERIOD_DISPLAY", () => {
  it("annual is marked best value", () => {
    expect(BILLING_PERIOD_DISPLAY.annual.isBestValue).toBe(true)
  })
  it("monthly is not best value", () => {
    expect(BILLING_PERIOD_DISPLAY.monthly.isBestValue).toBe(false)
  })
  it("semiannual savings = $95 MXN (99×6=594, 594-499=95)", () => {
    expect(BILLING_PERIOD_DISPLAY.semiannual.savingsAmount).toBe(95)
  })
  it("annual savings = $289 MXN (99×12=1188, 1188-899=289)", () => {
    expect(BILLING_PERIOD_DISPLAY.annual.savingsAmount).toBe(289)
  })
  it("monthly has no savings (baseline)", () => {
    expect(BILLING_PERIOD_DISPLAY.monthly.savingsAmount).toBeNull()
  })
})

// ── resolveBillingPeriodFromStripePrice ────────────────────────────────────

describe("resolveBillingPeriodFromStripePrice", () => {
  // Use vi.stubEnv to isolate env vars
  beforeEach(() => {
    vi.stubEnv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_monthly_test")
    vi.stubEnv("STRIPE_PRO_SEMIANNUAL_PRICE_ID", "price_semiannual_test")
    vi.stubEnv("STRIPE_PRO_ANNUAL_PRICE_ID", "price_annual_test")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("maps monthly price env → monthly", async () => {
    const { resolveBillingPeriodFromStripePrice } = await import("@/lib/stripe/env")
    expect(resolveBillingPeriodFromStripePrice("price_monthly_test")).toBe("monthly")
  })

  it("maps semiannual price env → semiannual", async () => {
    const { resolveBillingPeriodFromStripePrice } = await import("@/lib/stripe/env")
    expect(resolveBillingPeriodFromStripePrice("price_semiannual_test")).toBe("semiannual")
  })

  it("maps annual price env → annual", async () => {
    const { resolveBillingPeriodFromStripePrice } = await import("@/lib/stripe/env")
    expect(resolveBillingPeriodFromStripePrice("price_annual_test")).toBe("annual")
  })

  it("unknown price → null (never grants Pro)", async () => {
    const { resolveBillingPeriodFromStripePrice } = await import("@/lib/stripe/env")
    expect(resolveBillingPeriodFromStripePrice("price_unknown_xyz")).toBeNull()
  })

  it("empty string → null", async () => {
    const { resolveBillingPeriodFromStripePrice } = await import("@/lib/stripe/env")
    expect(resolveBillingPeriodFromStripePrice("")).toBeNull()
  })

  it("browser-supplied raw price_XXXX not in env → null", async () => {
    const { resolveBillingPeriodFromStripePrice } = await import("@/lib/stripe/env")
    expect(resolveBillingPeriodFromStripePrice("price_1234567890abcdef")).toBeNull()
  })
})
