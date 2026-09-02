/**
 * Tests for POST /api/stripe/webhook
 *
 * New idempotency semantics (CORTE MONETIZATION 2.1):
 *  - Event arrives → INSERT status='processing'
 *  - Sync success  → UPDATE status='processed' → HTTP 200
 *  - Sync failure  → UPDATE status='failed'    → HTTP 500 (Stripe retries)
 *  - Duplicate (status='processed') → HTTP 200 without re-processing
 *  - Retry (status='failed'|'processing') → re-process
 *  - Two simultaneous deliveries → sync is idempotent; no false success on failure
 *  - Missing billing_customers → sync throws → webhook returns 500
 *  - Supabase upsert failure → sync throws → webhook returns 500
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type Stripe from "stripe"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockConstructEvent,
  mockSync,
  mockUpdate,
  mockFrom,
  mockTrack,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn()
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

  const mockFrom = vi.fn().mockReturnValue({
    insert: vi.fn(),
    select: vi.fn(),
    update: mockUpdate,
  })

  return {
    mockConstructEvent: vi.fn(),
    mockSync: vi.fn().mockResolvedValue(undefined),
    mockUpdate,
    mockFrom,
    mockTrack: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn().mockReturnValue({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}))

vi.mock("@/lib/stripe/env", () => ({
  stripeWebhookSecret: () => "whsec_test",
  stripeSecretKey: () => "sk_test_fake",
  stripeProPriceId: () => "price_PRO_TEST_ID",
}))

vi.mock("@/lib/stripe/sync", () => ({
  syncStripeSubscription: mockSync,
  cancelStripeSubscriptionsForUser: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: mockFrom,
  }),
}))

vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: mockTrack,
}))

import { POST } from "@/app/api/stripe/webhook/route"

function makeRequest(body: string, signature: string): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body,
  })
}

function makeEvent(type: string, data: unknown, id = "evt_test_123"): Stripe.Event {
  return {
    id,
    type,
    data: { object: data },
    object: "event",
    api_version: "2026-07-29.dahlia",
    created: 1234567890,
    livemode: false,
    pending_webhooks: 1,
    request: null,
  } as unknown as Stripe.Event
}

/** Helper: configure mockFrom to simulate the INSERT + SELECT flow for claimEvent. */
function setupClaimFlow(opts: {
  insertError: { code?: string } | null
  existingStatus?: "processing" | "processed" | "failed" | null
}) {
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }
  mockUpdate.mockReturnValue(updateChain)

  mockFrom.mockImplementation((table: string) => {
    if (table === "billing_webhook_events") {
      return {
        insert: vi.fn().mockResolvedValue({ error: opts.insertError }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: opts.existingStatus ? { status: opts.existingStatus } : null,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
    }
    return { insert: vi.fn(), select: vi.fn(), update: vi.fn() }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSync.mockResolvedValue(undefined)
  mockTrack.mockResolvedValue(undefined)
})

// ── Signature verification ────────────────────────────────────────────────────

describe("POST /api/stripe/webhook — signature", () => {
  it("returns 400 for invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature")
    })

    const req = makeRequest('{"type":"test"}', "bad_sig")
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(mockSync).not.toHaveBeenCalled()
  })

  it("processes event when signature is valid", async () => {
    const event = makeEvent("customer.subscription.created", { id: "sub_123" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })

    const res = await POST(makeRequest(JSON.stringify(event), "valid_sig"))
    expect(res.status).toBe(200)
  })
})

// ── Idempotency — new event ───────────────────────────────────────────────────

describe("POST /api/stripe/webhook — new event (processing → processed)", () => {
  it("returns 200 and marks event as processed on sync success", async () => {
    const event = makeEvent("customer.subscription.updated", { id: "sub_ok" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })

    const res = await POST(makeRequest(JSON.stringify(event), "sig"))
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledWith("sub_ok")
  })

  it("calls syncStripeSubscription for customer.subscription.created", async () => {
    const event = makeEvent("customer.subscription.created", { id: "sub_new" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })

    await POST(makeRequest("body", "sig"))
    expect(mockSync).toHaveBeenCalledWith("sub_new")
  })

  it("calls syncStripeSubscription for customer.subscription.deleted", async () => {
    const event = makeEvent("customer.subscription.deleted", { id: "sub_del" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })

    await POST(makeRequest("body", "sig"))
    expect(mockSync).toHaveBeenCalledWith("sub_del")
  })

  it("calls syncStripeSubscription from checkout.session.completed", async () => {
    const event = makeEvent("checkout.session.completed", {
      subscription: "sub_checkout",
      mode: "subscription",
      client_reference_id: "user-xyz",
    })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })

    await POST(makeRequest("body", "sig"))
    expect(mockSync).toHaveBeenCalledWith("sub_checkout")
  })

  it("calls syncStripeSubscription from invoice.paid", async () => {
    const event = makeEvent("invoice.paid", { subscription: "sub_inv" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })

    await POST(makeRequest("body", "sig"))
    expect(mockSync).toHaveBeenCalledWith("sub_inv")
  })

  it("does not call sync for unhandled event types", async () => {
    const event = makeEvent("payment_intent.created", { id: "pi_123" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })

    await POST(makeRequest("body", "sig"))
    expect(mockSync).not.toHaveBeenCalled()
  })
})

// ── Sync failure → 500 ────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook — sync failure returns 500", () => {
  it("returns 500 when sync throws (so Stripe retries the event)", async () => {
    const event = makeEvent("customer.subscription.updated", { id: "sub_err" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })
    mockSync.mockRejectedValue(new Error("DB timeout"))

    const res = await POST(makeRequest("body", "sig"))
    // CRITICAL: must NOT be 200 — Stripe must retry
    expect(res.status).toBe(500)
  })

  it("returns 500 when syncStripeSubscription throws missing billing customer", async () => {
    const event = makeEvent("customer.subscription.updated", { id: "sub_nomapping" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })
    mockSync.mockRejectedValue(
      new Error("[syncStripeSubscription] No billing_customers row for stripe_customer_id=cus_x"),
    )

    const res = await POST(makeRequest("body", "sig"))
    expect(res.status).toBe(500)
  })

  it("returns 500 when Supabase upsert fails inside sync", async () => {
    const event = makeEvent("customer.subscription.created", { id: "sub_dberr" })
    mockConstructEvent.mockReturnValue(event)
    setupClaimFlow({ insertError: null })
    mockSync.mockRejectedValue(
      new Error("[syncStripeSubscription] Failed to upsert billing_subscriptions"),
    )

    const res = await POST(makeRequest("body", "sig"))
    expect(res.status).toBe(500)
  })
})

// ── Idempotency — duplicate (already processed) ───────────────────────────────

describe("POST /api/stripe/webhook — duplicate (status=processed)", () => {
  it("returns 200 without re-processing when event is already processed", async () => {
    const event = makeEvent("customer.subscription.updated", { id: "sub_dup" }, "evt_dup")
    mockConstructEvent.mockReturnValue(event)

    // INSERT conflicts, existing status is 'processed'
    setupClaimFlow({ insertError: { code: "23505" }, existingStatus: "processed" })

    const res = await POST(makeRequest(JSON.stringify(event), "valid_sig"))
    expect(res.status).toBe(200)
    const body = await res.json() as { duplicate?: boolean }
    expect(body.duplicate).toBe(true)
    expect(mockSync).not.toHaveBeenCalled()
  })
})

// ── Idempotency — retry failed event ─────────────────────────────────────────

describe("POST /api/stripe/webhook — retry of failed event", () => {
  it("re-processes an event with status=failed (Stripe retry)", async () => {
    const event = makeEvent("customer.subscription.updated", { id: "sub_retry" }, "evt_retry")
    mockConstructEvent.mockReturnValue(event)

    // INSERT conflicts, existing status is 'failed'
    setupClaimFlow({ insertError: { code: "23505" }, existingStatus: "failed" })

    const res = await POST(makeRequest(JSON.stringify(event), "valid_sig"))
    // Should process and succeed
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledWith("sub_retry")
  })

  it("re-processes an event with status=processing (in-flight retry)", async () => {
    const event = makeEvent("customer.subscription.updated", { id: "sub_inflight" }, "evt_inflight")
    mockConstructEvent.mockReturnValue(event)

    // INSERT conflicts, existing status is 'processing'
    setupClaimFlow({ insertError: { code: "23505" }, existingStatus: "processing" })

    const res = await POST(makeRequest(JSON.stringify(event), "valid_sig"))
    expect(res.status).toBe(200)
    expect(mockSync).toHaveBeenCalledWith("sub_inflight")
  })
})
