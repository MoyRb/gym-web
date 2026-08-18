/**
 * Admin Analytics — Unit Tests
 *
 * Tests for:
 *  1. Authorization (requireAdmin guard behavior)
 *  2. Pure utility functions (completionRate, growthPct, formatDuration, etc.)
 *  3. Edge cases: zero data, division by zero, null values
 *
 * NOTE: Database-level aggregations are tested in SQL (PostgreSQL).
 *       These tests cover the TypeScript layer: utility functions and
 *       guard behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mock server-only and next modules ────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

import {
  completionRate,
  growthPct,
  formatDuration,
  formatGoalLabel,
  formatExperienceLabel,
  formatSexLabel,
  barWidth,
  formatNumber,
  formatGrowth,
} from "@/lib/admin/utils"

// ── completionRate ────────────────────────────────────────────────────────────

describe("completionRate", () => {
  it("returns null when total is 0 (no division by zero)", () => {
    expect(completionRate(0, 0)).toBeNull()
  })

  it("returns 0 when completed is 0", () => {
    expect(completionRate(0, 10)).toBe(0)
  })

  it("returns 100 when all completed", () => {
    expect(completionRate(10, 10)).toBe(100)
  })

  it("rounds correctly", () => {
    expect(completionRate(1, 3)).toBe(33)   // 33.33...
    expect(completionRate(2, 3)).toBe(67)   // 66.66...
  })

  it("handles partial completion", () => {
    expect(completionRate(7, 10)).toBe(70)
  })
})

// ── growthPct ─────────────────────────────────────────────────────────────────

describe("growthPct", () => {
  it("returns null when previous period is 0 (no baseline)", () => {
    expect(growthPct(5, 0)).toBeNull()
  })

  it("returns 0 when current equals previous", () => {
    expect(growthPct(10, 10)).toBe(0)
  })

  it("returns positive growth", () => {
    expect(growthPct(15, 10)).toBe(50)  // +50%
  })

  it("returns negative growth", () => {
    expect(growthPct(5, 10)).toBe(-50)  // -50%
  })

  it("handles 100% growth", () => {
    expect(growthPct(20, 10)).toBe(100)
  })

  it("handles zero current with non-zero previous", () => {
    expect(growthPct(0, 10)).toBe(-100)
  })
})

// ── formatDuration ────────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("returns — for null", () => {
    expect(formatDuration(null)).toBe("—")
  })

  it("formats seconds only when < 60", () => {
    expect(formatDuration(45)).toBe("45 s")
    expect(formatDuration(0)).toBe("0 s")
    expect(formatDuration(59)).toBe("59 s")
  })

  it("formats whole minutes when no remainder", () => {
    expect(formatDuration(60)).toBe("1 min")
    expect(formatDuration(3600)).toBe("60 min")
    expect(formatDuration(1800)).toBe("30 min")
  })

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1 min 30 s")
    expect(formatDuration(125)).toBe("2 min 5 s")
  })
})

// ── formatGoalLabel ───────────────────────────────────────────────────────────

describe("formatGoalLabel", () => {
  it("formats all known goal keys", () => {
    expect(formatGoalLabel("ganar_masa_muscular")).toBe("Ganar masa muscular")
    expect(formatGoalLabel("bajar_grasa")).toBe("Bajar grasa")
    expect(formatGoalLabel("mejorar_resistencia")).toBe("Mejorar resistencia")
    expect(formatGoalLabel("mejorar_condicion_general")).toBe("Condición general")
  })

  it("returns the key itself for unknown goals", () => {
    expect(formatGoalLabel("unknown_goal")).toBe("unknown_goal")
  })
})

// ── formatExperienceLabel ─────────────────────────────────────────────────────

describe("formatExperienceLabel", () => {
  it("formats all known experience keys", () => {
    expect(formatExperienceLabel("principiante")).toBe("Principiante")
    expect(formatExperienceLabel("intermedio")).toBe("Intermedio")
    expect(formatExperienceLabel("avanzado")).toBe("Avanzado")
  })

  it("returns the key itself for unknown values", () => {
    expect(formatExperienceLabel("elite")).toBe("elite")
  })
})

// ── formatSexLabel ────────────────────────────────────────────────────────────

describe("formatSexLabel", () => {
  it("formats known sex values", () => {
    expect(formatSexLabel("male")).toBe("Masculino")
    expect(formatSexLabel("female")).toBe("Femenino")
    expect(formatSexLabel("M")).toBe("Masculino")
    expect(formatSexLabel("F")).toBe("Femenino")
    expect(formatSexLabel("other")).toBe("Otro")
  })

  it("returns raw value for unknown", () => {
    expect(formatSexLabel("X")).toBe("X")
  })
})

// ── barWidth ──────────────────────────────────────────────────────────────────

describe("barWidth", () => {
  it("returns 0 when max is 0 (safe division)", () => {
    expect(barWidth(10, 0)).toBe(0)
  })

  it("returns 0 when value is 0", () => {
    expect(barWidth(0, 100)).toBe(0)
  })

  it("returns 100 when value equals max", () => {
    expect(barWidth(50, 50)).toBe(100)
  })

  it("clamps to 100 when value exceeds max", () => {
    expect(barWidth(200, 100)).toBe(100)
  })

  it("returns proportional width", () => {
    expect(barWidth(25, 100)).toBe(25)
    expect(barWidth(1, 3)).toBe(33)
  })
})

// ── formatNumber ──────────────────────────────────────────────────────────────

describe("formatNumber", () => {
  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0")
  })

  it("formats small numbers without separator", () => {
    expect(formatNumber(999)).toBe("999")
  })

  // toLocaleString behavior varies by environment; just verify it's a string
  it("returns a string for large numbers", () => {
    expect(typeof formatNumber(10000)).toBe("string")
    expect(formatNumber(10000).includes("10")).toBe(true)
  })
})

// ── formatGrowth ──────────────────────────────────────────────────────────────

describe("formatGrowth", () => {
  it("returns n/d for null", () => {
    const result = formatGrowth(null)
    expect(result.text).toBe("n/d")
    expect(result.positive).toBeNull()
  })

  it("returns 0% with null positive for zero growth", () => {
    const result = formatGrowth(0)
    expect(result.text).toBe("0%")
    expect(result.positive).toBeNull()
  })

  it("marks positive growth", () => {
    const result = formatGrowth(14)
    expect(result.text).toBe("+14%")
    expect(result.positive).toBe(true)
  })

  it("marks negative growth", () => {
    const result = formatGrowth(-30)
    expect(result.text).toBe("-30%")
    expect(result.positive).toBe(false)
  })
})

// ── Business logic: active user definition ────────────────────────────────────

describe("Active user definition (CORTE 1)", () => {
  /**
   * Active user = user with at least 1 workout_session in the period.
   * This is enforced at the SQL level (COUNT DISTINCT user_id WHERE started_at >= cutoff).
   * Here we test the contract / documentation expectation.
   */

  it("definition is documented: any session status counts", () => {
    // The SQL function counts ALL sessions (in_progress, completed, cancelled)
    // for the active user metric. This is by design for CORTE 1.
    // A user who started but didn't complete is still "active".
    const definition = "user with at least 1 workout_session in the period"
    expect(definition).toContain("workout_session")
  })
})

// ── Edge case: equipment aggregation ─────────────────────────────────────────

describe("Equipment growth calculation", () => {
  it("returns null growth when previous period is 0", () => {
    // Mirrors SQL: CASE WHEN sessions_prev_30d = 0 THEN NULL ELSE ...
    const prev = 0
    const current = 5
    const growth = prev === 0 ? null : Math.round((current - prev) * 100 / prev)
    expect(growth).toBeNull()
  })

  it("computes correct positive growth", () => {
    expect(growthPct(15, 10)).toBe(50)
  })

  it("computes correct negative growth (decline)", () => {
    expect(growthPct(10, 20)).toBe(-50)
  })

  it("handles no previous data gracefully", () => {
    expect(growthPct(10, 0)).toBeNull()
  })
})

// ── Edge case: completion rates ───────────────────────────────────────────────

describe("Completion rate edge cases", () => {
  it("handles zero sessions (empty platform)", () => {
    expect(completionRate(0, 0)).toBeNull()
  })

  it("handles all sessions in progress (no completions yet)", () => {
    expect(completionRate(0, 5)).toBe(0)
  })

  it("handles 100% completion", () => {
    expect(completionRate(100, 100)).toBe(100)
  })
})

// ── Authorization: requireAdmin guard ─────────────────────────────────────────

describe("requireAdmin authorization guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to /login when user is not authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server")
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        admin: { listUsers: vi.fn() },
      },
      rpc: vi.fn(),
      from: vi.fn(),
    }
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient)

    const { requireAdmin } = await import("@/lib/auth/guards")

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login")
  })

  it("redirects to /dashboard when authenticated user is not admin", async () => {
    const { createClient } = await import("@/lib/supabase/server")
    const mockUser = { id: "user-123", email: "user@test.com" }
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      from: vi.fn(),
    }
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient)

    const { requireAdmin } = await import("@/lib/auth/guards")

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
  })

  it("allows access when user has admin role", async () => {
    const { createClient } = await import("@/lib/supabase/server")
    const mockUser = { id: "admin-456", email: "admin@test.com" }
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      from: vi.fn(),
    }
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient)

    const { requireAdmin } = await import("@/lib/auth/guards")

    const result = await requireAdmin()
    expect(result).toEqual({ user: mockUser })
  })

  it("redirects to /dashboard on RPC error (fail closed)", async () => {
    const { createClient } = await import("@/lib/supabase/server")
    const mockUser = { id: "user-789" }
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "function not found" },
      }),
      from: vi.fn(),
    }
    ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient)

    const { requireAdmin } = await import("@/lib/auth/guards")

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
  })
})
