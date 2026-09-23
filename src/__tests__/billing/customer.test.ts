/**
 * Tests for getOrCreateStripeCustomer
 *
 * Verifies:
 *  - Returns existing stripe_customer_id when mapping found
 *  - Creates Stripe Customer and persists mapping when not found
 *  - Throws when DB lookup returns an error (not silently "no customer")
 *  - Throws when insert fails for non-conflict reasons
 *  - Handles concurrent creation (23505) by retrying the lookup
 *  - Throws when retry lookup also fails (degraded state)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockFrom,
  mockCreateStripeCustomer,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCreateStripeCustomer: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("./server", () => ({
  getStripe: vi.fn().mockReturnValue({
    customers: { create: mockCreateStripeCustomer },
  }),
}))

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn().mockReturnValue({
    customers: { create: mockCreateStripeCustomer },
  }),
}))

import { getOrCreateStripeCustomer } from "@/lib/stripe/customer"

/** Build a chain where maybeSingle resolves with { data, error } */
function makeSelectChain(data: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateStripeCustomer.mockResolvedValue({ id: "cus_new_123" })
})

// ── Existing mapping ──────────────────────────────────────────────────────────

describe("getOrCreateStripeCustomer — existing mapping", () => {
  it("returns existing stripe_customer_id without creating a new customer", async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({ stripe_customer_id: "cus_existing_abc" }),
    )

    const result = await getOrCreateStripeCustomer("user-1", "test@example.com", false)

    expect(result).toBe("cus_existing_abc")
    expect(mockCreateStripeCustomer).not.toHaveBeenCalled()
  })
})

// ── Create new mapping ────────────────────────────────────────────────────────

describe("getOrCreateStripeCustomer — new customer creation", () => {
  it("creates a Stripe Customer and returns the new ID when no mapping exists", async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: lookup returns no existing customer
        return makeSelectChain(null)
      }
      // Second call: insert succeeds
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    })

    const result = await getOrCreateStripeCustomer("user-2", "new@example.com", false)

    expect(result).toBe("cus_new_123")
    expect(mockCreateStripeCustomer).toHaveBeenCalledWith({
      email: "new@example.com",
      metadata: { supabase_user_id: "user-2" },
    })
  })
})

// ── DB error on lookup ────────────────────────────────────────────────────────

describe("getOrCreateStripeCustomer — DB lookup error", () => {
  it("throws when the initial SELECT returns a DB error", async () => {
    mockFrom.mockReturnValue(
      makeSelectChain(null, { code: "PGRST301", message: "DB error" }),
    )

    await expect(
      getOrCreateStripeCustomer("user-3", "err@example.com", false),
    ).rejects.toThrow(/DB error looking up billing_customers/)
  })
})

// ── DB error on insert ────────────────────────────────────────────────────────

describe("getOrCreateStripeCustomer — DB insert error", () => {
  it("throws when insert fails for a non-conflict reason", async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain(null)
      return { insert: vi.fn().mockResolvedValue({ error: { code: "23502", message: "not null violation" } }) }
    })

    await expect(
      getOrCreateStripeCustomer("user-4", "inserterr@example.com", false),
    ).rejects.toThrow(/Failed to persist billing_customers/)
  })
})

// ── Concurrent creation (23505) ───────────────────────────────────────────────

describe("getOrCreateStripeCustomer — concurrent creation race", () => {
  it("returns the winner's customer ID when 23505 conflict occurs on insert", async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Initial lookup: no existing
        return makeSelectChain(null)
      }
      if (callCount === 2) {
        // Insert: conflict (another concurrent request already inserted)
        return { insert: vi.fn().mockResolvedValue({ error: { code: "23505" } }) }
      }
      // Retry lookup: finds the winner's mapping
      return makeSelectChain({ stripe_customer_id: "cus_winner_456" })
    })

    const result = await getOrCreateStripeCustomer("user-5", "race@example.com", false)
    expect(result).toBe("cus_winner_456")
  })

  it("throws when retry lookup after 23505 also fails", async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain(null)
      if (callCount === 2) {
        return { insert: vi.fn().mockResolvedValue({ error: { code: "23505" } }) }
      }
      // Retry SELECT: DB error
      return makeSelectChain(null, { code: "PGRST" })
    })

    await expect(
      getOrCreateStripeCustomer("user-6", "retry-fail@example.com", false),
    ).rejects.toThrow(/Concurrent creation conflict and retry failed/)
  })

  it("throws when retry lookup returns no row after 23505", async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return makeSelectChain(null)
      if (callCount === 2) {
        return { insert: vi.fn().mockResolvedValue({ error: { code: "23505" } }) }
      }
      // Retry SELECT: no row (shouldn't happen, but handle it)
      return makeSelectChain(null)
    })

    await expect(
      getOrCreateStripeCustomer("user-7", "retry-norow@example.com", false),
    ).rejects.toThrow(/Concurrent creation conflict and retry failed/)
  })
})
