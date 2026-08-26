/**
 * Tests for POST /api/account/delete
 *
 * Verifies:
 *  - Returns 401 when no authenticated session
 *  - userId comes from server session only (not request body)
 *  - Calls auth.admin.deleteUser with the session userId
 *  - Returns 500 if deleteUser fails
 *  - Returns 200 { success: true } on success
 *  - Tracks account_deletion_started event
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockGetUser, mockDeleteUser, mockTrackServerEvent } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const mockDeleteUser = vi.fn()
  const mockTrackServerEvent = vi.fn().mockResolvedValue(undefined)
  return { mockGetUser, mockDeleteUser, mockTrackServerEvent }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
  createServiceRoleClient: vi.fn().mockReturnValue({
    auth: { admin: { deleteUser: mockDeleteUser } },
  }),
}))

vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: mockTrackServerEvent,
}))

import { POST } from "@/app/api/account/delete/route"

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTrackServerEvent.mockResolvedValue(undefined)
  })

  it("returns 401 when no authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await POST()
    expect(res.status).toBe(401)

    const body = await res.json() as { error?: string }
    expect(body).toHaveProperty("error")
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it("calls deleteUser with the session userId", async () => {
    const userId = "session-user-uuid"
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    mockDeleteUser.mockResolvedValue({ error: null })

    await POST()

    expect(mockDeleteUser).toHaveBeenCalledWith(userId)
    expect(mockDeleteUser).toHaveBeenCalledTimes(1)
  })

  it("returns 200 with success:true on successful deletion", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1" } } })
    mockDeleteUser.mockResolvedValue({ error: null })

    const res = await POST()
    expect(res.status).toBe(200)

    const body = await res.json() as { success?: boolean }
    expect(body.success).toBe(true)
  })

  it("returns 500 when deleteUser returns an error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-2" } } })
    mockDeleteUser.mockResolvedValue({ error: new Error("Supabase error") })

    const res = await POST()
    expect(res.status).toBe(500)

    const body = await res.json() as { error?: string }
    expect(body).toHaveProperty("error")
  })

  it("tracks account_deletion_started event with the session userId", async () => {
    const userId = "uid-track"
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } })
    mockDeleteUser.mockResolvedValue({ error: null })

    await POST()

    expect(mockTrackServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "account_deletion_started",
        userId,
      })
    )
  })

  it("does not delete a different user than the session user", async () => {
    // The route has no body parsing — userId ONLY comes from the session.
    // This test confirms the session user is the one being deleted.
    const sessionUserId = "real-session-user"
    mockGetUser.mockResolvedValue({ data: { user: { id: sessionUserId } } })
    mockDeleteUser.mockResolvedValue({ error: null })

    const res = await POST()
    expect(res.status).toBe(200)

    // Must be called with session userId, not any other value
    const [calledWithId] = mockDeleteUser.mock.calls[0] as [string]
    expect(calledWithId).toBe(sessionUserId)
  })
})
