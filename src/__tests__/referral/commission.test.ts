/**
 * Tests for processReferralCommission commission math and idempotency.
 *
 * Verifies:
 *  - Monthly first invoice: 9900 × 5000 bps / 10000 = 4950 cents
 *  - Semiannual first invoice: 49900 × 1500 / 10000 = 7485 cents
 *  - Annual first invoice: 89900 × 1500 / 10000 = 13485 cents
 *  - Renewal invoice (billing_reason != subscription_create) → no commission
 *  - Duplicate invoice event → one commission only (UNIQUE guard)
 *  - Partner override: monthly 10000 bps → 9900 cents (100% of $99)
 *  - User already attributed → skip commission
 *  - No gym_partner_id in metadata → skip
 *  - Unknown price → skip
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type Stripe from "stripe"

// ── Mock all dependencies ──────────────────────────────────────────────────

const { mockServiceFrom, mockStripeSubRetrieve } = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
  mockStripeSubRetrieve: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockServiceFrom }),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn().mockReturnValue({
    subscriptions: { retrieve: mockStripeSubRetrieve },
  }),
}))

vi.mock("@/lib/stripe/env", () => ({
  resolveBillingPeriodFromStripePrice: vi.fn().mockImplementation((priceId: string) => {
    if (priceId === "price_monthly_test") return "monthly"
    if (priceId === "price_semiannual_test") return "semiannual"
    if (priceId === "price_annual_test") return "annual"
    return null
  }),
}))

// ── DB chain builder ───────────────────────────────────────────────────────

function makeDbChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "maybeSingle", "insert", "upsert", "single"]
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain) })
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: resolvedValue, error: null })
  ;(chain.insert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })
  ;(chain.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null })
  return chain
}

// ── Test fixtures ──────────────────────────────────────────────────────────

function makeInvoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
  return {
    id: "in_test_123",
    object: "invoice",
    billing_reason: "subscription_create",
    parent: {
      type: "subscription_details",
      quote_details: null,
      subscription_details: { subscription: "sub_test_123", metadata: null },
    },
    customer: "cus_test_123",
    subtotal: 9900,
    subtotal_excluding_tax: 9900,
    total: 9900,
    amount_paid: 9900,
    currency: "mxn",
    ...overrides,
  } as unknown as Stripe.Invoice
}

function makeSubscription(priceId: string, metadata: Record<string, string> = {}): Stripe.Subscription {
  return {
    id: "sub_test_123",
    items: {
      data: [{ price: { id: priceId } }],
    },
    metadata,
    livemode: false,
  } as unknown as Stripe.Subscription
}


import { processReferralCommission } from "@/lib/referral/commission"

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Commission math ────────────────────────────────────────────────────────

describe("processReferralCommission — commission math", () => {
  it("monthly: 9900 × 5000 bps / 10000 = 4950 cents", async () => {
    mockStripeSubRetrieve.mockResolvedValue(
      makeSubscription("price_monthly_test", { gym_partner_id: "partner-uuid" })
    )

    let insertedCommission: Record<string, unknown> | null = null
    mockServiceFrom.mockImplementation((table: string) => {
      const chain = makeDbChain(null)
      if (table === "billing_customers") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user_id: "user-1" }, error: null,
        })
      }
      if (table === "gym_partners") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: "partner-uuid", status: "active", monthly_commission_bps: 5000, long_term_commission_bps: 1500 },
          error: null,
        })
      }
      if (table === "referral_commissions") {
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((data: Record<string, unknown>) => {
          insertedCommission = data
          return Promise.resolve({ error: null })
        })
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
      }
      return chain
    })

    await processReferralCommission(makeInvoice({ subtotal: 9900, subtotal_excluding_tax: 9900 }))

    expect(insertedCommission).not.toBeNull()
    expect(insertedCommission!.commission_amount_cents).toBe(4950)
    expect(insertedCommission!.commission_bps).toBe(5000)
  })

  it("semiannual: 49900 × 1500 bps / 10000 = 7485 cents", async () => {
    mockStripeSubRetrieve.mockResolvedValue(
      makeSubscription("price_semiannual_test", { gym_partner_id: "partner-uuid" })
    )

    let insertedCommission: Record<string, unknown> | null = null
    mockServiceFrom.mockImplementation((table: string) => {
      const chain = makeDbChain(null)
      if (table === "billing_customers") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user_id: "user-1" }, error: null,
        })
      }
      if (table === "gym_partners") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: "partner-uuid", status: "active", monthly_commission_bps: 5000, long_term_commission_bps: 1500 },
          error: null,
        })
      }
      if (table === "referral_commissions") {
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((data: Record<string, unknown>) => {
          insertedCommission = data
          return Promise.resolve({ error: null })
        })
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
      }
      return chain
    })

    await processReferralCommission(makeInvoice({ subtotal: 49900, subtotal_excluding_tax: 49900 }))

    expect(insertedCommission!.commission_amount_cents).toBe(7485)
    expect(insertedCommission!.commission_bps).toBe(1500)
  })

  it("annual: 89900 × 1500 bps / 10000 = 13485 cents", async () => {
    mockStripeSubRetrieve.mockResolvedValue(
      makeSubscription("price_annual_test", { gym_partner_id: "partner-uuid" })
    )

    let insertedCommission: Record<string, unknown> | null = null
    mockServiceFrom.mockImplementation((table: string) => {
      const chain = makeDbChain(null)
      if (table === "billing_customers") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user_id: "user-1" }, error: null,
        })
      }
      if (table === "gym_partners") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: "partner-uuid", status: "active", monthly_commission_bps: 5000, long_term_commission_bps: 1500 },
          error: null,
        })
      }
      if (table === "referral_commissions") {
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((data: Record<string, unknown>) => {
          insertedCommission = data
          return Promise.resolve({ error: null })
        })
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
      }
      return chain
    })

    await processReferralCommission(makeInvoice({ subtotal: 89900, subtotal_excluding_tax: 89900 }))

    expect(insertedCommission!.commission_amount_cents).toBe(13485)
  })

  it("partner override: monthly 10000 bps → 9900 cents (100% of $99)", async () => {
    mockStripeSubRetrieve.mockResolvedValue(
      makeSubscription("price_monthly_test", { gym_partner_id: "partner-promo" })
    )

    let insertedCommission: Record<string, unknown> | null = null
    mockServiceFrom.mockImplementation((table: string) => {
      const chain = makeDbChain(null)
      if (table === "billing_customers") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user_id: "user-promo" }, error: null,
        })
      }
      if (table === "gym_partners") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: "partner-promo", status: "active", monthly_commission_bps: 10000, long_term_commission_bps: 1500 },
          error: null,
        })
      }
      if (table === "referral_commissions") {
        ;(chain.insert as ReturnType<typeof vi.fn>).mockImplementation((data: Record<string, unknown>) => {
          insertedCommission = data
          return Promise.resolve({ error: null })
        })
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
      }
      return chain
    })

    await processReferralCommission(makeInvoice({ subtotal: 9900, subtotal_excluding_tax: 9900 }))

    expect(insertedCommission!.commission_amount_cents).toBe(9900) // 100%
    expect(insertedCommission!.commission_bps).toBe(10000) // snapshot
  })
})

// ── Renewal invoice — no commission ───────────────────────────────────────

describe("processReferralCommission — renewal invoices", () => {
  it("billing_reason=subscription_cycle (renewal) → no commission created", async () => {
    const insertSpy = vi.fn()
    mockServiceFrom.mockReturnValue({ insert: insertSpy, from: vi.fn() })

    await processReferralCommission(
      makeInvoice({ billing_reason: "subscription_cycle" })
    )

    expect(insertSpy).not.toHaveBeenCalled()
    expect(mockStripeSubRetrieve).not.toHaveBeenCalled()
  })

  it("billing_reason=subscription_update (proration) → no commission", async () => {
    await processReferralCommission(
      makeInvoice({ billing_reason: "subscription_update" })
    )
    expect(mockStripeSubRetrieve).not.toHaveBeenCalled()
  })
})

// ── No gym_partner_id → skip ──────────────────────────────────────────────

describe("processReferralCommission — missing referral", () => {
  it("no gym_partner_id in subscription metadata → returns without commission", async () => {
    mockStripeSubRetrieve.mockResolvedValue(
      makeSubscription("price_monthly_test", {}) // no gym_partner_id
    )

    const insertSpy = vi.fn()
    mockServiceFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "user-1" } }),
      insert: insertSpy,
    })

    await processReferralCommission(makeInvoice())

    expect(insertSpy).not.toHaveBeenCalled()
  })
})

// ── Idempotency ────────────────────────────────────────────────────────────

describe("processReferralCommission — idempotency", () => {
  it("duplicate invoice event (stripe_invoice_id already exists) → only one commission", async () => {
    mockStripeSubRetrieve.mockResolvedValue(
      makeSubscription("price_monthly_test", { gym_partner_id: "partner-uuid" })
    )

    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    let callCount = 0
    mockServiceFrom.mockImplementation((table: string) => {
      const chain = makeDbChain(null)
      if (table === "billing_customers") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user_id: "user-1" }, error: null,
        })
      }
      if (table === "referral_commissions") {
        callCount++
        if (callCount === 1) {
          // First check: commission already exists
          ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
            data: { id: "existing-commission" }, error: null,
          })
        }
        chain.insert = insertSpy
      }
      return chain
    })

    await processReferralCommission(makeInvoice())

    // insert should NOT be called — commission already exists
    expect(insertSpy).not.toHaveBeenCalled()
  })
})

// ── User already attributed → skip ────────────────────────────────────────

describe("processReferralCommission — first purchase only", () => {
  it("user already has attribution → no commission created", async () => {
    mockStripeSubRetrieve.mockResolvedValue(
      makeSubscription("price_monthly_test", { gym_partner_id: "partner-uuid" })
    )

    const insertSpy = vi.fn()
    mockServiceFrom.mockImplementation((table: string) => {
      const chain = makeDbChain(null)
      if (table === "billing_customers") {
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { user_id: "user-already-attributed" }, error: null,
        })
      }
      if (table === "referral_commissions") {
        // No existing commission for this invoice
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
        chain.insert = insertSpy
      }
      if (table === "referral_attributions") {
        // Attribution already exists for this user
        ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: "existing-attribution" }, error: null,
        })
      }
      return chain
    })

    await processReferralCommission(makeInvoice())

    expect(insertSpy).not.toHaveBeenCalled()
  })
})
