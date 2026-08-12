import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockRedirect, mockGetUser, mockRpc, mockCreateServiceRoleClient } = vi.hoisted(() => {
  const mockRedirect = vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`)
  })
  const mockGetUser = vi.fn()
  const mockRpc = vi.fn()
  const mockCreateServiceRoleClient = vi.fn(() => {
    throw new Error("createServiceRoleClient must not be called from guards")
  })
  return { mockRedirect, mockGetUser, mockRpc, mockCreateServiceRoleClient }
})

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  })),
  createServiceRoleClient: mockCreateServiceRoleClient,
}))

import { requireAdmin, requireAuthenticatedUser } from "@/lib/auth/guards"

const fakeUser = { id: "user-123", email: "test@example.com" }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("requireAuthenticatedUser", () => {
  it("redirects to /login when there is no session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(requireAuthenticatedUser()).rejects.toThrow("REDIRECT:/login")
    expect(mockRedirect).toHaveBeenCalledWith("/login")
  })

  it("returns the user when a session exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } })
    const result = await requireAuthenticatedUser()
    expect(result).toEqual({ user: fakeUser })
  })
})

describe("requireAdmin", () => {
  // item 15 — anon: sin sesión → redirect, rpc nunca se llama
  it("(15) anon: redirects to /login and never calls is_current_user_admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/login")
    expect(mockRedirect).toHaveBeenCalledWith("/login")
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // item 13 — member obtiene false
  it("(13) member: redirects to /dashboard when is_current_user_admin returns false", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } })
    mockRpc.mockResolvedValue({ data: false, error: null })
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  it("redirects to /dashboard when rpc returns an error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } })
    mockRpc.mockResolvedValue({ data: null, error: new Error("db error") })
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard")
  })

  // item 14 — admin obtiene true
  it("(14) admin: returns user when is_current_user_admin returns true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } })
    mockRpc.mockResolvedValue({ data: true, error: null })
    const result = await requireAdmin()
    expect(result).toEqual({ user: fakeUser })
  })

  // item 17 — Service Role no se instancia antes del guard
  it("(17) does not instantiate the service role client", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } })
    mockRpc.mockResolvedValue({ data: true, error: null })
    await requireAdmin()
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled()
  })
})
