/**
 * Tests for POST /api/billing/portal
 *
 * Verifies:
 *  - Requires authentication
 *  - Resolves stripe_customer_id from server-side mapping (never from browser)
 *  - Returns 404 when no billing account exists
 *  - Returns portal URL on success
 *  - return_url is hardcoded (no open redirect)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockGetUser, mockFrom, mockCreatePortal, mockTrack } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockCreatePortal: vi.fn(),
  mockTrack: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: mockGetUser } }),
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn().mockReturnValue({
    billingPortal: {
      sessions: { create: mockCreatePortal },
    },
  }),
}))

vi.mock("@/lib/stripe/env", () => ({
  stripeSecretKey: () => "sk_test_fake",
  stripeProPriceId: () => "price_PRO_TEST",
  stripeWebhookSecret: () => "whsec_fake",
  isLiveMode: () => false,
}))

vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: mockTrack,
}))

vi.mock("@/config/site", () => ({
  siteConfig: { url: "https://alphatrainer.net" },
}))

import { POST } from "@/app/api/billing/portal/route"

function makeChain(data: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue({ data })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTrack.mockResolvedValue(undefined)
  mockCreatePortal.mockResolvedValue({ url: "https://billing.stripe.com/session/portal_xyz" })
})

describe("POST /api/billing/portal — auth", () => {
  it("returns 401 when no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST()
    expect(res.status).toBe(401)
  })
})

describe("POST /api/billing/portal — customer resolution", () => {
  it("returns 404 when no billing_customers row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc" } } })
    mockFrom.mockReturnValue(makeChain(null))

    const res = await POST()
    expect(res.status).toBe(404)
    expect(mockCreatePortal).not.toHaveBeenCalled()
  })

  it("uses stripe_customer_id from DB — never from browser", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc" } } })
    mockFrom.mockReturnValue(makeChain({ stripe_customer_id: "cus_fromdb" }))

    await POST()

    expect(mockCreatePortal).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_fromdb" }),
    )
  })
})

describe("POST /api/billing/portal — response", () => {
  it("returns portal URL on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc" } } })
    mockFrom.mockReturnValue(makeChain({ stripe_customer_id: "cus_abc" }))
    mockCreatePortal.mockResolvedValue({ url: "https://billing.stripe.com/portal/abc" })

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json() as { url?: string }
    expect(body.url).toBe("https://billing.stripe.com/portal/abc")
  })

  it("uses hardcoded return_url — not supplied by browser", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc" } } })
    mockFrom.mockReturnValue(makeChain({ stripe_customer_id: "cus_abc" }))

    await POST()

    // return_url must NOT be user-supplied; it points to our dashboard
    expect(mockCreatePortal).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: expect.stringContaining("/dashboard/perfil"),
      }),
    )
  })
})

// ── DB error handling — fail closed ──────────────────────────────────────────

describe("POST /api/billing/portal — DB error handling", () => {
  it("returns 500 when billing_customers lookup fails with DB error (not treated as no-customer)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-dberr" } } })

    // Simulate a DB error on customer lookup
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST" },
    })
    mockFrom.mockReturnValue(chain)

    const res = await POST()
    expect(res.status).toBe(500)
    expect(mockCreatePortal).not.toHaveBeenCalled()
  })
})
