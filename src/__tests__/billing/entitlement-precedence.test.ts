/**
 * Tests for Stripe entitlement precedence logic in syncStripeSubscription.
 *
 * Verifies:
 *  - Free + Stripe active → Pro granted
 *  - Stripe Pro canceled → downgraded to Free
 *  - Founder + Stripe active → Founder preserved (not overwritten)
 *  - Founder + Stripe canceled → Founder preserved
 *  - Manual entitlement + Stripe canceled → manual preserved
 *  - past_due → Pro preserved (not immediately revoked)
 *  - cancel_at_period_end + active → Pro still granted
 *  - Wrong price → Pro NOT granted
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockRetrieve,
  mockFrom,
  mockUpsert,
  mockDelete,
  mockSelect,
} = vi.hoisted(() => ({
  mockRetrieve: vi.fn(),
  mockFrom: vi.fn(),
  mockUpsert: vi.fn(),
  mockDelete: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn().mockReturnValue({
    subscriptions: { retrieve: mockRetrieve },
  }),
}))

vi.mock("@/lib/stripe/env", () => ({
  stripeProPriceId: () => "price_PRO_ID",
  stripeSecretKey: () => "sk_test_fake",
  stripeWebhookSecret: () => "whsec_fake",
}))

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

import { syncStripeSubscription } from "@/lib/stripe/sync"

// Helper: build a mock Stripe subscription
function makeStripeSub(overrides: {
  status?: string
  priceId?: string
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: number
  customerId?: string
} = {}) {
  return {
    id: "sub_test",
    customer: overrides.customerId ?? "cus_test",
    status: overrides.status ?? "active",
    cancel_at_period_end: overrides.cancelAtPeriodEnd ?? false,
    current_period_end: overrides.currentPeriodEnd ?? Math.floor(Date.now() / 1000) + 86400,
    items: {
      data: [{ price: { id: overrides.priceId ?? "price_PRO_ID" } }],
    },
  }
}

// Helper: set up mockFrom for different tables
function setupFrom(opts: {
  billingCustomer?: { user_id: string } | null
  accessRow?: { source: string; plan: string } | null
}) {
  // Use explicit undefined check so passing null is respected
  const defaultCustomer = { user_id: "user-abc" }
  const billingCustomerData =
    "billingCustomer" in opts ? opts.billingCustomer : defaultCustomer

  mockFrom.mockImplementation((table: string) => {
    if (table === "billing_customers") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: billingCustomerData,
            }),
          }),
        }),
      }
    }
    if (table === "billing_subscriptions") {
      return {
        upsert: mockUpsert.mockResolvedValue({ error: null }),
      }
    }
    if (table === "user_access") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opts.accessRow ?? null,
            }),
          }),
        }),
        upsert: mockUpsert.mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          eq: mockDelete.mockResolvedValue({ error: null }),
        }),
      }
    }
    return {
      select: mockSelect,
      upsert: mockUpsert,
      delete: vi.fn().mockReturnValue({ eq: mockDelete }),
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpsert.mockResolvedValue({ error: null })
  mockDelete.mockResolvedValue({ error: null })
})

// ── Granting Pro ──────────────────────────────────────────────────────────────

describe("syncStripeSubscription — granting Pro", () => {
  it("grants Pro when status=active and correct priceId (no existing row)", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "active", priceId: "price_PRO_ID" }))
    setupFrom({ billingCustomer: { user_id: "user-abc" }, accessRow: null })

    await syncStripeSubscription("sub_test")

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", source: "stripe", user_id: "user-abc" }),
      expect.anything(),
    )
  })

  it("grants Pro when status=trialing", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "trialing", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: null })

    await syncStripeSubscription("sub_test")

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", source: "stripe" }),
      expect.anything(),
    )
  })

  it("grants Pro when status=past_due (retry in progress — do not revoke immediately)", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "past_due", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: null })

    await syncStripeSubscription("sub_test")

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", source: "stripe" }),
      expect.anything(),
    )
  })

  it("grants Pro when cancel_at_period_end=true + status=active (still within period)", async () => {
    mockRetrieve.mockResolvedValue(
      makeStripeSub({ status: "active", cancelAtPeriodEnd: true, priceId: "price_PRO_ID" }),
    )
    setupFrom({ accessRow: null })

    await syncStripeSubscription("sub_test")

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "pro", source: "stripe" }),
      expect.anything(),
    )
  })
})

// ── Revoking Pro ──────────────────────────────────────────────────────────────

describe("syncStripeSubscription — revoking Pro", () => {
  it("removes stripe-managed access when subscription is canceled", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "canceled", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: { source: "stripe", plan: "pro" } })

    await syncStripeSubscription("sub_test")

    expect(mockDelete).toHaveBeenCalled()
  })

  it("does NOT grant Pro for wrong price ID", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "active", priceId: "price_WRONG" }))
    setupFrom({ accessRow: null })

    await syncStripeSubscription("sub_test")

    // upsert called for billing_subscriptions but NOT for user_access with plan=pro
    const userAccessUpserts = mockUpsert.mock.calls.filter(
      (call) => (call[0] as { plan?: string }).plan === "pro",
    )
    expect(userAccessUpserts).toHaveLength(0)
  })
})

// ── Entitlement precedence ────────────────────────────────────────────────────

describe("syncStripeSubscription — precedence", () => {
  it("does NOT overwrite founder_grant when Stripe sub is active", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "active", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: { source: "founder_grant", plan: "founder" } })

    await syncStripeSubscription("sub_test")

    // No user_access upsert with plan=pro should occur
    const proUpserts = mockUpsert.mock.calls.filter(
      (call) => (call[0] as { plan?: string }).plan === "pro",
    )
    expect(proUpserts).toHaveLength(0)
  })

  it("does NOT delete founder_grant when Stripe sub is canceled", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "canceled", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: { source: "founder_grant", plan: "founder" } })

    await syncStripeSubscription("sub_test")

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("does NOT delete manual_test access when Stripe sub is canceled", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "canceled", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: { source: "manual_test", plan: "pro" } })

    await syncStripeSubscription("sub_test")

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it("does delete stripe-managed access when Stripe sub is canceled", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "canceled", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: { source: "stripe", plan: "pro" } })

    await syncStripeSubscription("sub_test")

    expect(mockDelete).toHaveBeenCalled()
  })

  it("does nothing (no delete) when subscription canceled and user has no access row", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub({ status: "canceled", priceId: "price_PRO_ID" }))
    setupFrom({ accessRow: null })

    await syncStripeSubscription("sub_test")

    expect(mockDelete).not.toHaveBeenCalled()
  })
})

// ── No billing customer ───────────────────────────────────────────────────────

describe("syncStripeSubscription — missing billing customer", () => {
  it("throws when no billing_customers row exists (webhook must return 5xx for Stripe retry)", async () => {
    mockRetrieve.mockResolvedValue(makeStripeSub())
    setupFrom({ billingCustomer: null })

    // Must throw so the webhook handler returns 500 and Stripe retries the event.
    // A missing customer mapping is an error, not a silent success.
    await expect(syncStripeSubscription("sub_test")).rejects.toThrow(
      /No billing_customers row/,
    )

    // No user_access mutation should have happened
    const proUpserts = mockUpsert.mock.calls.filter(
      (call) => (call[0] as { plan?: string }).plan === "pro",
    )
    expect(proUpserts).toHaveLength(0)
  })
})
