/**
 * Tests for POST /api/billing/checkout
 *
 * Verifies:
 *  - Requires authenticated session (no anon access)
 *  - Requires verified real email
 *  - Blocks duplicate active subscriptions (already_subscribed)
 *  - Never accepts userId or priceId from the request body
 *  - Uses STRIPE_PRO_MONTHLY_PRICE_ID from env exclusively
 *  - Creates/reuses Stripe customer
 *  - Returns checkout URL on success
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockFrom,
  mockCreateSession,
  mockCreateCustomer,
  mockGetOrCreateCustomer,
  mockTrack,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockCreateSession: vi.fn(),
  mockCreateCustomer: vi.fn(),
  mockGetOrCreateCustomer: vi.fn(),
  mockTrack: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: mockGetUser } }),
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn().mockReturnValue({
    checkout: {
      sessions: { create: mockCreateSession },
    },
    customers: { create: mockCreateCustomer },
  }),
}))

vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: mockGetOrCreateCustomer,
}))

vi.mock("@/lib/stripe/env", () => ({
  stripeSecretKey: () => "sk_test_fake",
  stripeProPriceId: () => "price_PRO_TEST_ID",
  stripeWebhookSecret: () => "whsec_fake",
}))

vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: mockTrack,
}))

vi.mock("@/config/site", () => ({
  siteConfig: { url: "https://alphatrainer.net" },
}))

// Chain builder for Supabase queries
function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "in", "maybeSingle", "insert"]
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(result)
  return chain
}

import { POST } from "@/app/api/billing/checkout/route"

const VERIFIED_USER = {
  id: "user-123",
  email: "test@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTrack.mockResolvedValue(undefined)
  mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/session/xyz" })
  mockGetOrCreateCustomer.mockResolvedValue("cus_test_123")

  // Default: no existing subscription
  mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
})

// ── Auth ──────────────────────────────────────────────────────────────────────

describe("POST /api/billing/checkout — auth", () => {
  it("returns 401 when no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(401)
  })

  it("returns 403 for unverified email", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-unverified",
          email: "test@example.com",
          email_confirmed_at: null,
        },
      },
    })
    const res = await POST()
    expect(res.status).toBe(403)
    const body = await res.json() as { code?: string }
    expect(body.code).toBe("email_not_verified")
  })

  it("returns 403 for legacy internal email", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-legacy",
          email: "legacy@fitnessclub.local",
          email_confirmed_at: "2026-01-01T00:00:00Z",
        },
      },
    })
    const res = await POST()
    expect(res.status).toBe(403)
  })
})

// ── Duplicate subscription protection ─────────────────────────────────────────

describe("POST /api/billing/checkout — duplicate protection", () => {
  it("returns already_subscribed when active subscription exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })

    const chain = makeChain(null)
    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { stripe_subscription_id: "sub_existing", status: "active" },
    })
    mockFrom.mockReturnValue(chain)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json() as { code?: string }
    expect(body.code).toBe("already_subscribed")
    // Should NOT create a new checkout session
    expect(mockCreateSession).not.toHaveBeenCalled()
  })
})

// ── Price ID enforcement ──────────────────────────────────────────────────────

describe("POST /api/billing/checkout — price enforcement", () => {
  it("uses STRIPE_PRO_MONTHLY_PRICE_ID from env, never from request", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })

    await POST()

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: expect.arrayContaining([
          expect.objectContaining({ price: "price_PRO_TEST_ID" }),
        ]),
      }),
    )
  })

  it("sets client_reference_id to session userId", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })

    await POST()

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "user-123",
      }),
    )
  })

  it("includes user_id in metadata (from session, not browser)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })

    await POST()

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ user_id: "user-123" }),
      }),
    )
  })
})

// ── Customer management ───────────────────────────────────────────────────────

describe("POST /api/billing/checkout — customer", () => {
  it("calls getOrCreateStripeCustomer with session user data", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })

    await POST()

    expect(mockGetOrCreateCustomer).toHaveBeenCalledWith(
      "user-123",
      "test@example.com",
    )
  })

  it("uses returned customer ID in checkout session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })
    mockGetOrCreateCustomer.mockResolvedValue("cus_custom_456")

    await POST()

    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_custom_456" }),
    )
  })
})

// ── Success response ──────────────────────────────────────────────────────────

describe("POST /api/billing/checkout — response", () => {
  it("returns checkout URL on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })
    mockCreateSession.mockResolvedValue({ url: "https://checkout.stripe.com/session/abc" })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json() as { url?: string }
    expect(body.url).toBe("https://checkout.stripe.com/session/abc")
  })
})

// ── DB error handling — fail closed ──────────────────────────────────────────

describe("POST /api/billing/checkout — DB error handling", () => {
  it("returns 500 when subscription lookup fails with DB error (not treated as no-sub)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: VERIFIED_USER } })

    // Simulate a DB error on the subscription lookup
    const chain = makeChain(null)
    ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { code: "PGRST" },
    })
    mockFrom.mockReturnValue(chain)

    const res = await POST()
    expect(res.status).toBe(500)
    // Should NOT have attempted to create a checkout session
    expect(mockCreateSession).not.toHaveBeenCalled()
  })
})
