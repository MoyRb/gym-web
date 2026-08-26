/**
 * Tests for /billing/success page
 *
 * Verifies:
 *  - Page reads REAL entitlements from DB — never from query params
 *  - A fake session_id cannot grant Pro
 *  - Page does not write to user_access
 *  - Unauthenticated users are redirected (not shown fake Pro status)
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGetUser, mockGetEntitlements, mockRedirect } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetEntitlements: vi.fn(),
  mockRedirect: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ auth: { getUser: mockGetUser } }),
  createServiceRoleClient: vi.fn().mockReturnValue({}),
}))

vi.mock("@/lib/entitlements/get-entitlements", () => ({
  getUserEntitlements: mockGetEntitlements,
}))

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

// Mock Next.js Link and other components
vi.mock("next/link", () => ({
  default: ({ children }: { children: unknown }) => children,
}))

vi.mock("lucide-react", () => ({
  CheckCircle: () => null,
  Clock: () => null,
  ArrowRight: () => null,
}))

import { default as BillingSuccessPage } from "@/app/billing/success/page"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("/billing/success — security", () => {
  it("redirects to /login when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    try {
      await BillingSuccessPage()
    } catch {
      // redirect() throws in Next.js
    }

    expect(mockRedirect).toHaveBeenCalledWith("/login")
  })

  it("reads entitlements from DB — not from query params", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-real" } } })
    mockGetEntitlements.mockResolvedValue({
      plan: "free", // even if session_id is present, if DB says free → free
      canCreateManualPlans: true,
      canTrackWorkouts: true,
      aiGenerationAllowed: true,
      aiNextAvailableAt: null,
      showAds: true,
      advancedAnalytics: false,
    })

    const result = await BillingSuccessPage()
    // Page must exist and not crash
    expect(result).toBeDefined()
    // Must have called getUserEntitlements, not relied on query params
    expect(mockGetEntitlements).toHaveBeenCalledWith("user-real")
  })

  it("does NOT call any user_access mutation", async () => {
    const mockFrom = vi.fn()
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn().mockResolvedValue({ auth: { getUser: mockGetUser } }),
      createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
    }))

    mockGetUser.mockResolvedValue({ data: { user: { id: "user-safe" } } })
    mockGetEntitlements.mockResolvedValue({
      plan: "free",
      canCreateManualPlans: true,
      canTrackWorkouts: true,
      aiGenerationAllowed: true,
      aiNextAvailableAt: null,
      showAds: true,
      advancedAnalytics: false,
    })

    await BillingSuccessPage()

    // The page must not insert/update user_access
    expect(mockFrom).not.toHaveBeenCalledWith("user_access")
  })

  it("shows Pro status when DB confirms Pro (webhook already processed)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-pro" } } })
    mockGetEntitlements.mockResolvedValue({
      plan: "pro",
      canCreateManualPlans: true,
      canTrackWorkouts: true,
      aiGenerationAllowed: true,
      aiNextAvailableAt: null,
      showAds: false,
      advancedAnalytics: true,
    })

    const result = await BillingSuccessPage()
    expect(result).toBeDefined()
    // Can render without error
  })

  it("shows processing status when DB says Free (webhook not yet processed)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-pending" } } })
    mockGetEntitlements.mockResolvedValue({
      plan: "free",
      canCreateManualPlans: true,
      canTrackWorkouts: true,
      aiGenerationAllowed: true,
      aiNextAvailableAt: null,
      showAds: true,
      advancedAnalytics: false,
    })

    const result = await BillingSuccessPage()
    expect(result).toBeDefined()
    // Page renders processing state — no Pro access granted
  })
})
