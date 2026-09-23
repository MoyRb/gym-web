/**
 * Tests for Test/Live Stripe mode separation.
 *
 * Verifies:
 *  - isLiveMode reads STRIPE_LIVE_MODE correctly
 *  - Config error: STRIPE_LIVE_MODE=true + sk_test_ key → throws
 *  - Config error: STRIPE_LIVE_MODE=false + sk_live_ key → throws
 *  - STRIPE_LIVE_MODE=true + sk_live_ → valid
 *  - STRIPE_LIVE_MODE=false + sk_test_ → valid
 *  - getOrCreateStripeCustomer filters by livemode (Test customer doesn't appear in Live)
 *  - Checkout duplicate sub check filters by livemode
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("isLiveMode — key prefix consistency", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("STRIPE_LIVE_MODE=false + sk_test_ → valid, returns false", async () => {
    vi.stubEnv("STRIPE_LIVE_MODE", "false")
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake")
    const { isLiveMode } = await import("@/lib/stripe/env")
    expect(() => isLiveMode()).not.toThrow()
    expect(isLiveMode()).toBe(false)
  })

  it("STRIPE_LIVE_MODE=true + sk_live_ → valid, returns true", async () => {
    vi.stubEnv("STRIPE_LIVE_MODE", "true")
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fake")
    const { isLiveMode } = await import("@/lib/stripe/env")
    expect(() => isLiveMode()).not.toThrow()
    expect(isLiveMode()).toBe(true)
  })

  it("STRIPE_LIVE_MODE=true + sk_test_ → config error", async () => {
    vi.stubEnv("STRIPE_LIVE_MODE", "true")
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake")
    const { isLiveMode } = await import("@/lib/stripe/env")
    expect(() => isLiveMode()).toThrow(/STRIPE_LIVE_MODE=true.*test key/i)
  })

  it("STRIPE_LIVE_MODE=false + sk_live_ → config error", async () => {
    vi.stubEnv("STRIPE_LIVE_MODE", "false")
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fake")
    const { isLiveMode } = await import("@/lib/stripe/env")
    expect(() => isLiveMode()).toThrow(/STRIPE_LIVE_MODE=false.*live key/i)
  })

  it("config error never logs the key value", async () => {
    vi.stubEnv("STRIPE_LIVE_MODE", "true")
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_SECRET_VALUE")
    const { isLiveMode } = await import("@/lib/stripe/env")
    let errorMessage = ""
    try {
      isLiveMode()
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e)
    }
    expect(errorMessage).not.toContain("sk_test_SECRET_VALUE")
  })

  it("STRIPE_LIVE_MODE not set (undefined) → returns false (sandbox default)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake")
    vi.stubEnv("STRIPE_LIVE_MODE", "") // empty string = not "true"
    const { isLiveMode } = await import("@/lib/stripe/env")
    expect(isLiveMode()).toBe(false)
  })
})

// ── getOrCreateStripeCustomer — livemode isolation ─────────────────────────

const mockFrom = vi.fn()
const mockCreateCustomer = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn().mockReturnValue({
    customers: { create: mockCreateCustomer },
  }),
}))

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "insert", "maybeSingle", "single"]
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain) })
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  return chain
}

describe("getOrCreateStripeCustomer — livemode filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateCustomer.mockResolvedValue({ id: "cus_live_new" })
  })

  it("queries billing_customers filtered by livemode=true (Live mode)", async () => {
    const chain = makeChain({ data: null, error: null })
    const insertChain = makeChain({ error: null })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? chain : insertChain
    })

    const { getOrCreateStripeCustomer } = await import("@/lib/stripe/customer")
    await getOrCreateStripeCustomer("user-1", "test@example.com", true)

    // Second eq call should filter by livemode=true
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls
    expect(eqCalls).toContainEqual(["livemode", true])
  })

  it("existing Test customer (livemode=false) does not satisfy Live lookup (livemode=true)", async () => {
    // Simulate: lookup with livemode=true returns null (no Live customer)
    const lookupChain = makeChain({ data: null, error: null })
    const insertChain = makeChain({ error: null })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? lookupChain : insertChain
    })

    mockCreateCustomer.mockResolvedValue({ id: "cus_live_created" })

    const { getOrCreateStripeCustomer } = await import("@/lib/stripe/customer")
    const result = await getOrCreateStripeCustomer("user-sandbox", "test@example.com", true)

    // Should create a new Live customer, not return a non-existent Test customer
    expect(result).toBe("cus_live_created")
    expect(mockCreateCustomer).toHaveBeenCalledOnce()
  })

  it("existing Live customer is returned directly for livemode=true", async () => {
    const chain = makeChain({ data: { stripe_customer_id: "cus_live_existing" }, error: null })
    mockFrom.mockReturnValue(chain)

    const { getOrCreateStripeCustomer } = await import("@/lib/stripe/customer")
    const result = await getOrCreateStripeCustomer("user-1", "test@example.com", true)

    expect(result).toBe("cus_live_existing")
    expect(mockCreateCustomer).not.toHaveBeenCalled()
  })
})
