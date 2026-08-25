/**
 * get-entitlements.test.ts
 *
 * Tests for the getUserEntitlements() server function.
 * All Supabase calls are mocked — no real DB needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { PLAN_CONFIG } from "@/lib/entitlements/config"

// ── Mock service role client ───────────────────────────────────────────────────

const mockMaybeSingle = vi.fn()
const mockHead        = vi.fn()
const mockOrder       = vi.fn()
const mockLimit       = vi.fn()
const mockGte         = vi.fn()
const mockEq          = vi.fn()
const mockSelect      = vi.fn()
const mockFrom        = vi.fn()

// Chain setup
const baseChain = {
  select: mockSelect,
  eq: mockEq,
  gte: mockGte,
  limit: mockLimit,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
}

mockSelect.mockReturnValue(baseChain)
mockEq.mockReturnValue(baseChain)
mockGte.mockReturnValue(baseChain)
mockLimit.mockReturnValue(baseChain)
mockOrder.mockReturnValue(baseChain)
mockHead.mockReturnValue(baseChain)
mockMaybeSingle.mockResolvedValue({ data: null, error: null })

mockFrom.mockReturnValue(baseChain)

const mockServiceClient = { from: mockFrom }

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockServiceClient,
}))

import { getUserEntitlements } from "@/lib/entitlements/get-entitlements"

beforeEach(() => {
  vi.clearAllMocks()
  mockSelect.mockReturnValue(baseChain)
  mockEq.mockReturnValue(baseChain)
  mockGte.mockReturnValue(baseChain)
  mockLimit.mockReturnValue(baseChain)
  mockOrder.mockReturnValue(baseChain)
  mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  mockFrom.mockReturnValue(baseChain)
})

// ── Helper: set up mockFrom to return different data per table ─────────────────

function setupMocks({
  accessRow = null,
  genCount = 0,
  oldestCompleted = null,
}: {
  accessRow?: { plan: string; valid_until: string | null } | null
  genCount?: number
  oldestCompleted?: { updated_at: string } | null
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "user_access") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: accessRow, error: null }),
          }),
        }),
      }
    }
    if (table === "ai_generation_sessions") {
      // Returns different chains for count vs maybeSingle queries
      // The count query resolves via awaiting the chain
      const countResolvable = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: oldestCompleted, error: null }),
        // When awaited, return count result
        then: (resolve: (v: { count: number }) => void) => resolve({ count: genCount }),
        catch: () => countResolvable,
      }

      return {
        select: vi.fn().mockReturnValue(countResolvable),
      }
    }
    return baseChain
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getUserEntitlements — plan resolution", () => {
  it("returns free when no user_access row exists", async () => {
    setupMocks({ accessRow: null, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.plan).toBe("free")
  })

  it("returns pro when user_access row has plan=pro", async () => {
    setupMocks({ accessRow: { plan: "pro", valid_until: null }, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.plan).toBe("pro")
  })

  it("falls back to free if valid_until is in the past", async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    setupMocks({ accessRow: { plan: "pro", valid_until: past }, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.plan).toBe("free")
  })

  it("keeps pro if valid_until is null (no expiry)", async () => {
    setupMocks({ accessRow: { plan: "pro", valid_until: null }, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.plan).toBe("pro")
  })
})

describe("getUserEntitlements — static entitlements", () => {
  it("all plans: canCreateManualPlans = true", async () => {
    setupMocks({ accessRow: null, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.canCreateManualPlans).toBe(true)
  })

  it("all plans: canTrackWorkouts = true", async () => {
    setupMocks({ accessRow: null, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.canTrackWorkouts).toBe(true)
  })

  it("free: showAds = true", async () => {
    setupMocks({ accessRow: null, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.showAds).toBe(true)
  })

  it("pro: showAds = false", async () => {
    setupMocks({ accessRow: { plan: "pro", valid_until: null }, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.showAds).toBe(false)
  })

  it("free: advancedAnalytics = false", async () => {
    setupMocks({ accessRow: null, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.advancedAnalytics).toBe(false)
  })

  it("pro: advancedAnalytics = true", async () => {
    setupMocks({ accessRow: { plan: "pro", valid_until: null }, genCount: 0 })
    const e = await getUserEntitlements("user-1")
    expect(e.advancedAnalytics).toBe(true)
  })
})

describe("getUserEntitlements — plan config", () => {
  it("FREE_AI_WINDOW_DAYS is 7", () => {
    expect(PLAN_CONFIG.FREE_AI_WINDOW_DAYS).toBe(7)
  })

  it("FREE_AI_GENERATIONS is 1", () => {
    expect(PLAN_CONFIG.FREE_AI_GENERATIONS).toBe(1)
  })

  it("PRO_AI_WINDOW_DAYS is 30", () => {
    expect(PLAN_CONFIG.PRO_AI_WINDOW_DAYS).toBe(30)
  })

  it("PRO_AI_GENERATIONS is 20", () => {
    expect(PLAN_CONFIG.PRO_AI_GENERATIONS).toBe(20)
  })
})
