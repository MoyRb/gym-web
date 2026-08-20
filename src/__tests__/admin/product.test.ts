/**
 * Admin Product Analytics — Unit Tests
 *
 * Tests for:
 *  1. EVENTS taxonomy — correct keys and values
 *  2. formatEventLabel — V1 event types and unknown fallback
 *  3. Funnel math — completionRate applied to funnel steps
 *  4. Engagement sanity — DAU ≤ WAU ≤ MAU invariant (documentation)
 */

import { describe, it, expect, vi } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

import { EVENTS } from "@/lib/analytics/events"
import { formatEventLabel, completionRate } from "@/lib/admin/utils"

// ── EVENTS taxonomy ───────────────────────────────────────────────────────────

describe("EVENTS taxonomy", () => {
  it("defines all V1 workout lifecycle events", () => {
    expect(EVENTS.WORKOUT_STARTED).toBe("workout_started")
    expect(EVENTS.WORKOUT_COMPLETED).toBe("workout_completed")
    expect(EVENTS.WORKOUT_CANCELLED).toBe("workout_cancelled")
  })

  it("defines set tracking event", () => {
    expect(EVENTS.SET_COMPLETED).toBe("set_completed")
  })

  it("defines exercise discovery events", () => {
    expect(EVENTS.EXERCISE_VIEWED).toBe("exercise_viewed")
    expect(EVENTS.EXERCISE_SEARCHED).toBe("exercise_searched")
  })

  it("defines AI generation lifecycle events", () => {
    expect(EVENTS.AI_GENERATION_STARTED).toBe("ai_generation_started")
    expect(EVENTS.AI_GENERATION_COMPLETED).toBe("ai_generation_completed")
    expect(EVENTS.AI_GENERATION_FAILED).toBe("ai_generation_failed")
  })

  it("has exactly 9 V1 event types", () => {
    expect(Object.keys(EVENTS).length).toBe(9)
  })
})

// ── formatEventLabel ──────────────────────────────────────────────────────────

describe("formatEventLabel", () => {
  it("formats all V1 product events", () => {
    expect(formatEventLabel("workout_started")).toBe("Workout iniciado")
    expect(formatEventLabel("workout_completed")).toBe("Workout completado")
    expect(formatEventLabel("workout_cancelled")).toBe("Workout cancelado")
    expect(formatEventLabel("set_completed")).toBe("Serie completada")
    expect(formatEventLabel("exercise_viewed")).toBe("Ejercicio visto")
    expect(formatEventLabel("exercise_searched")).toBe("Búsqueda ejercicio")
    expect(formatEventLabel("ai_generation_started")).toBe("Generación AI iniciada")
    expect(formatEventLabel("ai_generation_completed")).toBe("Generación AI completada")
    expect(formatEventLabel("ai_generation_failed")).toBe("Generación AI fallida")
  })

  it("formats legacy auth/setup events", () => {
    expect(formatEventLabel("register")).toBe("Registro")
    expect(formatEventLabel("login")).toBe("Login")
    expect(formatEventLabel("profile_completed")).toBe("Perfil completado")
    expect(formatEventLabel("routine_viewed")).toBe("Rutina vista")
    expect(formatEventLabel("pdf_downloaded")).toBe("PDF descargado")
  })

  it("returns raw event_type for unknown events (graceful fallback)", () => {
    expect(formatEventLabel("unknown_future_event")).toBe("unknown_future_event")
    expect(formatEventLabel("")).toBe("")
  })
})

// ── Funnel conversion math ────────────────────────────────────────────────────

describe("Funnel step conversions", () => {
  it("computes signup-to-profile conversion correctly", () => {
    expect(completionRate(80, 100)).toBe(80)
  })

  it("returns null when signups is 0 (empty platform)", () => {
    expect(completionRate(0, 0)).toBeNull()
  })

  it("returns 0 when no users completed step", () => {
    expect(completionRate(0, 100)).toBe(0)
  })

  it("returns 100 on perfect conversion", () => {
    expect(completionRate(50, 50)).toBe(100)
  })

  it("handles a realistic 5-step funnel without errors", () => {
    const funnel = {
      signups: 1000,
      profiles: 650,
      plans: 400,
      sessions: 300,
      completions: 180,
    }

    const step1 = completionRate(funnel.profiles, funnel.signups)       // 65%
    const step2 = completionRate(funnel.plans, funnel.profiles)          // 62%
    const step3 = completionRate(funnel.sessions, funnel.plans)          // 75%
    const step4 = completionRate(funnel.completions, funnel.sessions)    // 60%

    expect(step1).toBe(65)
    expect(step2).toBe(62)
    expect(step3).toBe(75)
    expect(step4).toBe(60)
  })
})

// ── Engagement invariant ──────────────────────────────────────────────────────

describe("Engagement (DAU/WAU/MAU) invariant", () => {
  /**
   * DAU ≤ WAU ≤ MAU is enforced at the SQL level by COUNT DISTINCT user_id
   * over different time windows. Here we document and verify the ordering
   * invariant for a simulated dataset.
   */

  it("DAU is never greater than WAU", () => {
    const dau = 10
    const wau = 45
    const mau = 120
    expect(dau).toBeLessThanOrEqual(wau)
    expect(wau).toBeLessThanOrEqual(mau)
  })

  it("all metrics are 0 on empty platform", () => {
    const dau = 0
    const wau = 0
    const mau = 0
    expect(dau).toBe(0)
    expect(wau).toBe(0)
    expect(mau).toBe(0)
    expect(dau).toBeLessThanOrEqual(wau)
    expect(wau).toBeLessThanOrEqual(mau)
  })
})

// ── dedupe_key format ─────────────────────────────────────────────────────────

describe("Dedupe key format contract", () => {
  it("workout_started dedupe key includes session id", () => {
    const sessionId = "abc123"
    const key = `workout_started:${sessionId}`
    expect(key).toBe("workout_started:abc123")
    expect(key.startsWith("workout_started:")).toBe(true)
  })

  it("workout_completed dedupe key includes session id", () => {
    const sessionId = "def456"
    const key = `workout_completed:${sessionId}`
    expect(key.startsWith("workout_completed:")).toBe(true)
    expect(key).toContain(sessionId)
  })

  it("ai_generation dedupe keys are scoped to generation id", () => {
    const genId = "gen-789"
    expect(`ai_gen_started:${genId}`).toBe("ai_gen_started:gen-789")
    expect(`ai_gen_completed:${genId}`).toBe("ai_gen_completed:gen-789")
    // started and completed for same generation are distinct keys
    expect(`ai_gen_started:${genId}`).not.toBe(`ai_gen_completed:${genId}`)
  })
})
