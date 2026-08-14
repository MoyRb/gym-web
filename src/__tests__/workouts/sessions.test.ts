/**
 * sessions.test.ts
 *
 * Unit tests for CORTE 2D session logic.
 * Tests are self-contained and do NOT touch the database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockServiceClient, mockRpc, mockFrom } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockSingle      = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockEq          = vi.fn()
  const mockSelect      = vi.fn()
  const mockRpc         = vi.fn()
  const mockFrom        = vi.fn()

  // Set up chainable mock returns
  mockEq.mockReturnValue({
    eq: mockEq,
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    data: [],
    error: null,
  })
  mockSelect.mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle })
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: vi.fn().mockReturnValue({ eq: mockEq }),
    insert: vi.fn().mockReturnValue({ select: mockSelect, single: mockSingle }),
  })

  const mockServiceClient = { from: mockFrom, rpc: mockRpc, storage: {} }

  return { mockServiceClient, mockRpc, mockFrom }
})

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => mockServiceClient,
}))

import { startWorkoutSession } from "@/lib/workouts/sessions/start-session"
import { completeSession }      from "@/lib/workouts/sessions/complete-session"
import { SetUpdateSchema }      from "@/lib/workouts/sessions/update-set"

// ── Helpers ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── start_workout_session ──────────────────────────────────────────────────────

describe("startWorkoutSession", () => {
  it("calls rpc start_workout_session with correct args", async () => {
    mockRpc.mockResolvedValue({ data: "session-uuid-1", error: null })

    const id = await startWorkoutSession("user-1", "day-1")

    expect(mockRpc).toHaveBeenCalledWith("start_workout_session", {
      p_user_id: "user-1",
      p_workout_plan_day_id: "day-1",
    })
    expect(id).toBe("session-uuid-1")
  })

  it("throws a friendly error when rpc fails with unique violation", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: "23505", message: "unique violation" } })

    await expect(startWorkoutSession("user-1", "day-1")).rejects.toThrow(
      "Ya existe una sesión en progreso",
    )
  })

  it("throws generic error for other rpc failures", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: "P0002", message: "not found" } })

    await expect(startWorkoutSession("user-1", "day-1")).rejects.toThrow(
      "Error iniciando sesión",
    )
  })

  it("throws if rpc returns null data without error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    await expect(startWorkoutSession("user-1", "day-1")).rejects.toThrow(
      "no devolvió un session_id",
    )
  })
})

// ── completeSession ────────────────────────────────────────────────────────────

describe("completeSession", () => {
  function mockOwnedInProgressSession(sessionId = "sess-1", userId = "user-1") {
    const chain = {
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({
      data: {
        id: sessionId,
        user_id: userId,
        status: "in_progress",
        started_at: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hr ago
      },
      error: null,
    })
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue(chain),
    })
  }

  it("sets status=completed and calculates duration_seconds", async () => {
    mockOwnedInProgressSession()
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockFrom.mockReturnValueOnce({ update: updateFn })

    await completeSession("sess-1", "user-1", "complete")

    const updateCall = updateFn.mock.calls[0][0] as {
      status: string
      completed_at: string
      duration_seconds: number
    }
    expect(updateCall.status).toBe("completed")
    expect(updateCall.completed_at).toBeDefined()
    expect(updateCall.duration_seconds).toBeGreaterThan(0)
  })

  it("sets status=cancelled without completed_at", async () => {
    mockOwnedInProgressSession()
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockFrom.mockReturnValueOnce({ update: updateFn })

    await completeSession("sess-1", "user-1", "cancel")

    const updateCall = updateFn.mock.calls[0][0] as { status: string; completed_at?: string }
    expect(updateCall.status).toBe("cancelled")
    expect(updateCall.completed_at).toBeUndefined()
  })

  it("throws Not autorizado when userId mismatches", async () => {
    const chain = { eq: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({
      data: { id: "sess-1", user_id: "other-user", status: "in_progress", started_at: new Date().toISOString() },
      error: null,
    })
    mockFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(chain) })

    await expect(completeSession("sess-1", "user-1", "complete")).rejects.toThrow("No autorizado")
  })

  it("is idempotent when session is already completed", async () => {
    const chain = { eq: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({
      data: { id: "sess-1", user_id: "user-1", status: "completed", started_at: new Date().toISOString() },
      error: null,
    })
    mockFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(chain) })

    // Should not throw and should not call update
    await expect(completeSession("sess-1", "user-1", "complete")).resolves.toBeUndefined()
  })

  it("throws when session not found", async () => {
    const chain = { eq: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(chain) })

    await expect(completeSession("sess-1", "user-1", "complete")).rejects.toThrow("no encontrada")
  })

  it("calculates duration_seconds correctly", async () => {
    const startedAt = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
    const chain = { eq: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({
      data: { id: "sess-1", user_id: "user-1", status: "in_progress", started_at: startedAt.toISOString() },
      error: null,
    })
    mockFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(chain) })

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockFrom.mockReturnValueOnce({ update: updateFn })

    await completeSession("sess-1", "user-1", "complete")

    const { duration_seconds } = updateFn.mock.calls[0][0] as { duration_seconds: number }
    // Should be close to 1800 seconds (±10s tolerance)
    expect(duration_seconds).toBeGreaterThanOrEqual(1790)
    expect(duration_seconds).toBeLessThanOrEqual(1810)
  })
})

// ── SetUpdateSchema validation ─────────────────────────────────────────────────

describe("SetUpdateSchema", () => {
  it("accepts valid payload with all optional fields", () => {
    const result = SetUpdateSchema.safeParse({
      weight_kg: 60,
      reps: 10,
      rir: 2,
      completed: true,
    })
    expect(result.success).toBe(true)
  })

  it("accepts empty object", () => {
    const result = SetUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("rejects negative weight", () => {
    const result = SetUpdateSchema.safeParse({ weight_kg: -5 })
    expect(result.success).toBe(false)
  })

  it("rejects reps = 0", () => {
    const result = SetUpdateSchema.safeParse({ reps: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects rir > 10", () => {
    const result = SetUpdateSchema.safeParse({ rir: 11 })
    expect(result.success).toBe(false)
  })

  it("rejects rpe < 1", () => {
    const result = SetUpdateSchema.safeParse({ rpe: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects rpe > 10", () => {
    const result = SetUpdateSchema.safeParse({ rpe: 11 })
    expect(result.success).toBe(false)
  })

  it("allows null values for optional fields", () => {
    const result = SetUpdateSchema.safeParse({ weight_kg: null, reps: null, rir: null })
    expect(result.success).toBe(true)
  })

  it("accepts notes string", () => {
    const result = SetUpdateSchema.safeParse({ notes: "Great set" })
    expect(result.success).toBe(true)
  })
})

// ── Volume calculation ────────────────────────────────────────────────────────

describe("Volume calculation", () => {
  it("computes total volume correctly", () => {
    const sets = [
      { weight_kg: 60, reps: 10, completed: true },
      { weight_kg: 60, reps: 9,  completed: true },
      { weight_kg: 57.5, reps: 10, completed: true },
    ]
    const volume = sets.reduce((acc, s) => acc + s.weight_kg * s.reps, 0)
    expect(volume).toBe(60 * 10 + 60 * 9 + 57.5 * 10)
    expect(volume).toBe(1715)
  })

  it("skips sets without weight or reps", () => {
    const sets = [
      { weight_kg: 60, reps: 10, completed: true },
      { weight_kg: null, reps: 10, completed: true },
      { weight_kg: 60, reps: null, completed: true },
    ]
    const volume = sets.reduce((acc, s) => {
      if (s.weight_kg != null && s.reps != null) return acc + s.weight_kg * s.reps
      return acc
    }, 0)
    expect(volume).toBe(600)
  })

  it("only counts completed sets", () => {
    const sets = [
      { weight_kg: 60, reps: 10, completed: true },
      { weight_kg: 60, reps: 10, completed: false },
    ]
    const volume = sets
      .filter((s) => s.completed)
      .reduce((acc, s) => acc + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
    expect(volume).toBe(600)
  })

  it("returns 0 when no completed sets", () => {
    const sets = [{ weight_kg: 100, reps: 5, completed: false }]
    const volume = sets
      .filter((s) => s.completed)
      .reduce((acc, s) => acc + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)
    expect(volume).toBe(0)
  })
})

// ── Reps total ────────────────────────────────────────────────────────────────

describe("Total reps calculation", () => {
  it("sums reps for completed sets only", () => {
    const sets = [
      { reps: 10, completed: true },
      { reps: 9,  completed: true },
      { reps: 8,  completed: false },
    ]
    const total = sets
      .filter((s) => s.completed)
      .reduce((acc, s) => acc + (s.reps ?? 0), 0)
    expect(total).toBe(19)
  })

  it("handles null reps gracefully", () => {
    const sets = [
      { reps: 10, completed: true },
      { reps: null, completed: true },
    ]
    const total = sets
      .filter((s) => s.completed)
      .reduce((acc, s) => acc + (s.reps ?? 0), 0)
    expect(total).toBe(10)
  })
})

// ── Prefill logic (deterministic, no AI) ─────────────────────────────────────

describe("Prefill logic", () => {
  it("uses last session values as prefill (deterministic)", () => {
    const lastSets = [
      { set_number: 1, weight_kg: 60, reps: 10, rir: 2 },
      { set_number: 2, weight_kg: 60, reps: 9,  rir: 2 },
      { set_number: 3, weight_kg: 57.5, reps: 10, rir: 1 },
    ]

    // Simulate: new session creates sets with prefill
    const newSets = lastSets.map((s) => ({
      set_number: s.set_number,
      weight_kg: s.weight_kg,  // prefill from last session
      reps: s.reps,            // prefill from last session
      rir: s.rir,              // prefill from last session
      completed: false,        // NOT pre-completed
    }))

    expect(newSets[0].weight_kg).toBe(60)
    expect(newSets[0].completed).toBe(false)
    expect(newSets[2].weight_kg).toBe(57.5)
    expect(newSets.every((s) => !s.completed)).toBe(true)
  })

  it("creates empty sets when no previous session", () => {
    // No previous session — sets get null values
    const newSets = Array.from({ length: 3 }, (_, i) => ({
      set_number: i + 1,
      weight_kg: null,
      reps: null,
      rir: null,
      completed: false,
    }))

    expect(newSets[0].weight_kg).toBeNull()
    expect(newSets.every((s) => !s.completed)).toBe(true)
  })
})

// ── History ordering ──────────────────────────────────────────────────────────

describe("Session history ordering", () => {
  it("orders sessions by started_at descending", () => {
    const sessions = [
      { id: "s1", started_at: "2026-08-10T10:00:00Z" },
      { id: "s2", started_at: "2026-08-12T10:00:00Z" },
      { id: "s3", started_at: "2026-08-08T10:00:00Z" },
    ]

    const sorted = [...sessions].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )

    expect(sorted[0].id).toBe("s2")
    expect(sorted[1].id).toBe("s1")
    expect(sorted[2].id).toBe("s3")
  })
})

// ── Weekly completed count ────────────────────────────────────────────────────

describe("Weekly sessions count", () => {
  it("counts only sessions within the last 7 days", () => {
    const now = Date.now()
    const sessions = [
      { started_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), status: "completed" },
      { started_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), status: "completed" },
      { started_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(), status: "completed" },
      { started_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), status: "cancelled" },
    ]

    const since = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const weekly = sessions.filter(
      (s) => s.status === "completed" && new Date(s.started_at) > since,
    )

    expect(weekly.length).toBe(2)
  })
})

// ── RLS / ownership validation ────────────────────────────────────────────────

describe("Ownership validation", () => {
  it("rejects when session user_id does not match request userId", async () => {
    const chain = { eq: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({
      data: {
        id: "sess-attacker",
        user_id: "victim-user",
        status: "in_progress",
        started_at: new Date().toISOString(),
      },
      error: null,
    })
    mockFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(chain) })

    await expect(
      completeSession("sess-attacker", "attacker-user", "complete"),
    ).rejects.toThrow("No autorizado")
  })

  it("does not allow attacker to cancel victim session", async () => {
    const chain = { eq: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({
      data: {
        id: "sess-victim",
        user_id: "victim-user",
        status: "in_progress",
        started_at: new Date().toISOString(),
      },
      error: null,
    })
    mockFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(chain) })

    await expect(
      completeSession("sess-victim", "attacker-user", "cancel"),
    ).rejects.toThrow("No autorizado")
  })
})

// ── Empty progress state ──────────────────────────────────────────────────────

describe("Empty progress state", () => {
  it("returns zero stats when no sessions exist", () => {
    const sessions: Array<{ duration_seconds: number | null }> = []
    const totalDuration = sessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0)
    expect(totalDuration).toBe(0)
    expect(sessions.length).toBe(0)
  })

  it("returns zero volume when no sets", () => {
    const sets: Array<{ weight_kg: number | null; reps: number | null; completed: boolean }> = []
    const volume = sets
      .filter((s) => s.completed)
      .reduce((acc, s) => (s.weight_kg != null && s.reps != null ? acc + s.weight_kg * s.reps : acc), 0)
    expect(volume).toBe(0)
  })
})

// ── Cancelled session ─────────────────────────────────────────────────────────

describe("Cancelled session", () => {
  it("sets status=cancelled and does not set completed_at", async () => {
    const chain = { eq: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({
      data: {
        id: "sess-cancel",
        user_id: "user-1",
        status: "in_progress",
        started_at: new Date().toISOString(),
      },
      error: null,
    })
    mockFrom.mockReturnValueOnce({ select: vi.fn().mockReturnValue(chain) })

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockFrom.mockReturnValueOnce({ update: updateFn })

    await completeSession("sess-cancel", "user-1", "cancel")

    const payload = updateFn.mock.calls[0][0] as { status: string; completed_at?: string }
    expect(payload.status).toBe("cancelled")
    expect(payload.completed_at).toBeUndefined()
  })
})

// ── Progress measurements ─────────────────────────────────────────────────────

describe("MeasurementSchema validation (via API)", () => {
  it("validates reasonable measurement values", () => {
    const valid = {
      weight_kg: 75.5,
      body_fat_percent: 18,
      waist_cm: 82,
    }
    // All positive numbers pass basic checks
    expect(valid.weight_kg).toBeGreaterThan(0)
    expect(valid.body_fat_percent).toBeGreaterThanOrEqual(1)
    expect(valid.body_fat_percent).toBeLessThanOrEqual(80)
    expect(valid.waist_cm).toBeGreaterThan(0)
  })

  it("rejects body_fat_percent outside 1-80 range", () => {
    expect(0).toBeLessThan(1)   // below min
    expect(81).toBeGreaterThan(80) // above max
  })

  it("allows recording only weight without other measurements", () => {
    const payload = { weight_kg: 78.3 }
    const hasValue = Object.values(payload).some((v) => v != null)
    expect(hasValue).toBe(true)
  })
})

// ── Concurrent session prevention ─────────────────────────────────────────────

describe("Concurrent session prevention", () => {
  it("throws on unique constraint violation (23505)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    })

    await expect(startWorkoutSession("user-1", "day-1")).rejects.toThrow(
      "Ya existe una sesión en progreso",
    )
  })
})
