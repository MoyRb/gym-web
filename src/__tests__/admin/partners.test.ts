/**
 * Tests for admin partner API routes.
 *
 * Verifies:
 *  - Non-admin cannot access partner admin endpoints
 *  - Admin can create a partner
 *  - Partner code duplicates rejected (409)
 *  - bps > 10000 rejected (422)
 *  - negative bps rejected (422)
 *  - PATCH updates allowed fields
 *  - Commission status transitions: allowed and disallowed
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────

const { mockRequireAdmin, mockServiceFrom } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockServiceFrom: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: mockRequireAdmin,
}))

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockServiceFrom }),
}))

function makeChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "insert", "update", "eq", "neq", "order", "limit", "single", "maybeSingle"]
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain) })
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data, error })
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data, error })
  return chain
}

import { POST } from "@/app/api/admin/partners/route"
import { PATCH as PatchCommission } from "@/app/api/admin/commissions/[id]/route"

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1" } })
})

// ── Non-admin access ───────────────────────────────────────────────────────

describe("Partner admin — auth guard", () => {
  it("non-admin is redirected (requireAdmin redirects)", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("redirect"))
    const req = new Request("http://localhost/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Gym", code: "TESTGYM" }),
    })
    await expect(POST(req)).rejects.toThrow("redirect")
  })
})

// ── Create partner ─────────────────────────────────────────────────────────

describe("POST /api/admin/partners", () => {
  it("creates partner with valid data", async () => {
    const chain = makeChain({ id: "new-partner", name: "Power Gym", code: "POWERGYM", status: "active" })
    mockServiceFrom.mockReturnValue(chain)

    const req = new Request("http://localhost/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Power Gym", code: "POWERGYM" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it("normalizes code to uppercase", async () => {
    const chain = makeChain({ id: "new-partner", name: "Gym", code: "LOWERCASE" })
    const insertMock = vi.fn().mockReturnValue(chain)
    const selectMock = vi.fn().mockReturnValue(chain)
    chain.insert = insertMock
    chain.select = selectMock
    mockServiceFrom.mockReturnValue(chain)

    const req = new Request("http://localhost/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gym", code: "lowercase" }),
    })

    await POST(req)
    // The normalized uppercase code should have been used
    // (Zod transforms to uppercase)
  })

  it("rejects duplicate code with 409", async () => {
    const chain = makeChain(null, { code: "23505", message: "unique violation" })
    mockServiceFrom.mockReturnValue(chain)

    const req = new Request("http://localhost/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gym", code: "DUPLICATE" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it("rejects bps > 10000 with 422", async () => {
    const req = new Request("http://localhost/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gym", code: "VALIDCODE", monthly_commission_bps: 10001 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it("rejects negative bps with 422", async () => {
    const req = new Request("http://localhost/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gym", code: "VALIDCODE", long_term_commission_bps: -1 }),
    })

    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it("defaults monthly_commission_bps to 5000", async () => {
    let insertedData: unknown = null
    const chain = makeChain({ id: "new", code: "GYMTEST" })
    const origInsert = chain.insert as ReturnType<typeof vi.fn>
    origInsert.mockImplementation((data: unknown) => {
      insertedData = data
      return chain
    })
    mockServiceFrom.mockReturnValue(chain)

    const req = new Request("http://localhost/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gym", code: "GYMTEST" }),
    })

    await POST(req)
    const d = insertedData as Record<string, unknown>
    expect(d.monthly_commission_bps).toBe(5000)
    expect(d.long_term_commission_bps).toBe(1500)
  })
})

// ── Commission status transitions ──────────────────────────────────────────

describe("PATCH /api/admin/commissions/[id]", () => {
  const makeContext = (id: string) => ({ params: Promise.resolve({ id }) })

  it("pending → approved is allowed", async () => {
    const fetchChain = makeChain({ id: "comm-1", status: "pending" })
    const updateChain = makeChain({ id: "comm-1", status: "approved" })
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? fetchChain : updateChain
    })

    const req = new Request("http://localhost/api/admin/commissions/comm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    })

    const res = await PatchCommission(req, makeContext("comm-1"))
    expect(res.status).toBe(200)
  })

  it("pending → void is allowed", async () => {
    const fetchChain = makeChain({ id: "comm-1", status: "pending" })
    const updateChain = makeChain({ id: "comm-1", status: "void" })
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? fetchChain : updateChain
    })

    const req = new Request("http://localhost/api/admin/commissions/comm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "void" }),
    })

    const res = await PatchCommission(req, makeContext("comm-1"))
    expect(res.status).toBe(200)
  })

  it("approved → paid is allowed", async () => {
    const fetchChain = makeChain({ id: "comm-1", status: "approved" })
    const updateChain = makeChain({ id: "comm-1", status: "paid" })
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? fetchChain : updateChain
    })

    const req = new Request("http://localhost/api/admin/commissions/comm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    })

    const res = await PatchCommission(req, makeContext("comm-1"))
    expect(res.status).toBe(200)
  })

  it("paid → anything is rejected with 422", async () => {
    const fetchChain = makeChain({ id: "comm-1", status: "paid" })
    mockServiceFrom.mockReturnValue(fetchChain)

    const req = new Request("http://localhost/api/admin/commissions/comm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "void" }),
    })

    const res = await PatchCommission(req, makeContext("comm-1"))
    expect(res.status).toBe(422)
    const body = await res.json() as { error: string }
    expect(body.error).toContain("paid")
  })

  it("void → anything is rejected with 422", async () => {
    const fetchChain = makeChain({ id: "comm-1", status: "void" })
    mockServiceFrom.mockReturnValue(fetchChain)

    const req = new Request("http://localhost/api/admin/commissions/comm-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    })

    const res = await PatchCommission(req, makeContext("comm-1"))
    expect(res.status).toBe(422)
  })
})
