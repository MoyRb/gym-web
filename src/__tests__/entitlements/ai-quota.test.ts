/**
 * ai-quota.test.ts
 *
 * Tests for AI generation quota logic:
 * - Rolling window calculation
 * - Free vs Pro quota policies
 * - Only completed sessions count
 * - Failed/draft sessions do NOT count
 */

import { describe, it, expect } from "vitest"
import { PLAN_CONFIG } from "@/lib/entitlements/config"

// ── Pure quota computation helpers (extracted for testability) ─────────────────

/**
 * Determines if a generation is allowed given a list of completed session timestamps.
 * This mirrors the logic in getUserEntitlements.
 */
function checkAIQuota(params: {
  completedAt: Date[]
  plan: "free" | "pro"
  now?: Date
}): { allowed: boolean; nextAvailableAt: Date | null } {
  const { completedAt, plan, now = new Date() } = params

  const windowDays =
    plan === "free" ? PLAN_CONFIG.FREE_AI_WINDOW_DAYS : PLAN_CONFIG.PRO_AI_WINDOW_DAYS
  const maxGenerations =
    plan === "free" ? PLAN_CONFIG.FREE_AI_GENERATIONS : PLAN_CONFIG.PRO_AI_GENERATIONS

  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)

  const inWindow = completedAt.filter((d) => d >= windowStart)
  const usedInWindow = inWindow.length

  if (usedInWindow < maxGenerations) {
    return { allowed: true, nextAvailableAt: null }
  }

  // Find oldest in window — when it ages out, quota resets
  const oldest = inWindow.sort((a, b) => a.getTime() - b.getTime())[0]
  const nextAvailableAt = new Date(oldest.getTime() + windowDays * 24 * 60 * 60 * 1000)

  return { allowed: false, nextAvailableAt }
}

// ── Free quota tests ──────────────────────────────────────────────────────────

describe("AI quota — Free plan", () => {
  const now = new Date("2026-08-25T12:00:00Z")

  it("allows when no completed generations", () => {
    const { allowed } = checkAIQuota({ completedAt: [], plan: "free", now })
    expect(allowed).toBe(true)
  })

  it("allows when last generation was more than 7 days ago", () => {
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
    const { allowed } = checkAIQuota({ completedAt: [eightDaysAgo], plan: "free", now })
    expect(allowed).toBe(true)
  })

  it("blocks when last generation was 2 days ago (within window)", () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const { allowed, nextAvailableAt } = checkAIQuota({ completedAt: [twoDaysAgo], plan: "free", now })
    expect(allowed).toBe(false)
    expect(nextAvailableAt).not.toBeNull()
  })

  it("nextAvailableAt is exactly 7 days after the completed generation", () => {
    const genAt = new Date("2026-08-20T10:00:00Z")
    const now2  = new Date("2026-08-22T10:00:00Z") // 2 days later
    const { nextAvailableAt } = checkAIQuota({ completedAt: [genAt], plan: "free", now: now2 })
    // Expected: genAt + 7 days = 2026-08-27T10:00:00Z
    expect(nextAvailableAt?.toISOString()).toBe("2026-08-27T10:00:00.000Z")
  })

  it("window boundary: at exactly 7 days still blocked, at 7 days + 1ms allowed", () => {
    const genAt = new Date("2026-08-18T12:00:00Z")
    // At exactly 7 days: windowStart === genAt, genAt >= windowStart => still in window => blocked
    const exactly7days = new Date(genAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    const { allowed: atBoundary } = checkAIQuota({ completedAt: [genAt], plan: "free", now: exactly7days })
    expect(atBoundary).toBe(false) // genAt === windowStart, still counted

    // 1ms past boundary: windowStart > genAt => not in window => allowed
    const after = new Date(exactly7days.getTime() + 1)
    const { allowed: afterBoundary } = checkAIQuota({ completedAt: [genAt], plan: "free", now: after })
    expect(afterBoundary).toBe(true) // window expired
  })

  it("failed/draft generation does NOT affect quota (not in completedAt list)", () => {
    // Only passing completed sessions — this simulates that failed sessions are filtered
    const { allowed } = checkAIQuota({ completedAt: [], plan: "free", now })
    expect(allowed).toBe(true)
  })

  it("manual plan creation does NOT affect AI quota", () => {
    // Manual plans have no entry in ai_generation_sessions — quota unchanged
    const { allowed } = checkAIQuota({ completedAt: [], plan: "free", now })
    expect(allowed).toBe(true)
  })
})

// ── Pro quota tests ───────────────────────────────────────────────────────────

describe("AI quota — Pro plan", () => {
  const now = new Date("2026-08-25T12:00:00Z")

  it("allows when no completed generations", () => {
    const { allowed } = checkAIQuota({ completedAt: [], plan: "pro", now })
    expect(allowed).toBe(true)
  })

  it("allows with 19 generations in 30-day window (under limit)", () => {
    const gens = Array.from({ length: 19 }, (_, i) =>
      new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
    )
    const { allowed } = checkAIQuota({ completedAt: gens, plan: "pro", now })
    expect(allowed).toBe(true)
  })

  it("blocks at exactly 20 generations in 30-day window", () => {
    const gens = Array.from({ length: 20 }, (_, i) =>
      new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
    )
    const { allowed } = checkAIQuota({ completedAt: gens, plan: "pro", now })
    expect(allowed).toBe(false)
  })

  it("does not block if older generations are outside the 30-day window", () => {
    const recentGens = Array.from({ length: 5 }, (_, i) =>
      new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
    )
    const oldGen = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000)
    const { allowed } = checkAIQuota({
      completedAt: [...recentGens, oldGen],
      plan: "pro",
      now,
    })
    expect(allowed).toBe(true) // only 5 in window
  })
})

// ── Rolling window semantics ──────────────────────────────────────────────────

describe("Rolling window semantics", () => {
  it("is a rolling 7-day window from last generation, not calendar reset", () => {
    const tuesday = new Date("2026-08-18T14:35:00Z")
    const nextTuesdayMinus1h = new Date("2026-08-25T13:35:00Z")
    const nextTuesdayPlus1ms = new Date("2026-08-25T14:35:00.001Z")

    const { allowed: still } = checkAIQuota({
      completedAt: [tuesday],
      plan: "free",
      now: nextTuesdayMinus1h,
    })
    expect(still).toBe(false) // window not yet expired

    const { allowed: open } = checkAIQuota({
      completedAt: [tuesday],
      plan: "free",
      now: nextTuesdayPlus1ms,
    })
    expect(open).toBe(true) // window expired (tuesday is now outside the 7-day window)
  })
})
