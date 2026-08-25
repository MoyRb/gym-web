import { describe, it, expect, vi, beforeEach } from "vitest"
import { isSafeRedirectPath } from "@/lib/auth/app-url"

// Simulate the /auth/confirm route logic (token_hash + type → verifyOtp → redirect)

const { mockVerifyOtp, mockSignOut, mockCreateClient } = vi.hoisted(() => {
  const mockVerifyOtp = vi.fn()
  const mockSignOut   = vi.fn().mockResolvedValue({ error: null })
  const mockCreateClient = vi.fn(async () => ({
    auth: { verifyOtp: mockVerifyOtp, signOut: mockSignOut },
  }))
  return { mockVerifyOtp, mockSignOut, mockCreateClient }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

// Minimal route logic extracted for unit testing — mirrors the actual route handler
async function handleConfirm(params: {
  token_hash: string | null
  type: string | null
  next: string | null
  origin: string
}): Promise<{ redirectTo: string }> {
  const ALLOWED_OTP_TYPES = ["email", "recovery", "email_change", "invite", "magiclink"]
  const { token_hash, type, next, origin } = params

  if (!token_hash || !type || !ALLOWED_OTP_TYPES.includes(type)) {
    return { redirectTo: `${origin}/auth/confirm-error` }
  }

  const supabase = await mockCreateClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })

  if (error) {
    return { redirectTo: `${origin}/auth/confirm-error` }
  }

  // Recovery: keep temporary session for /reset-password to call updateUser
  if (type === "recovery") {
    return { redirectTo: `${origin}/reset-password` }
  }

  // Email signup confirmation: sign out temporary session, redirect to confirmed page
  if (type === "email") {
    await supabase.auth.signOut()
    return { redirectTo: `${origin}/auth/confirmed` }
  }

  // Other types: preserve session, use next or default
  const redirectPath = next && isSafeRedirectPath(next) ? next : "/dashboard/perfil"
  return { redirectTo: `${origin}${redirectPath}` }
}

const ORIGIN = "https://alphatrainer.net"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("/auth/confirm route logic (section 45)", () => {
  it("valid token_hash + type=email → verifyOtp called → signOut → /auth/confirmed", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "email",
      next: null,
      origin: ORIGIN,
    })

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: "abc123", type: "email" })
    expect(mockSignOut).toHaveBeenCalledOnce()
    expect(result.redirectTo).toBe(`${ORIGIN}/auth/confirmed`)
  })

  it("type=email: signOut is called to close the temporary verifyOtp session", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    await handleConfirm({ token_hash: "abc123", type: "email", next: null, origin: ORIGIN })

    expect(mockSignOut).toHaveBeenCalledOnce()
  })

  it("valid token_hash + type=recovery → redirect /reset-password (NO signOut)", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "recovery",
      next: null,
      origin: ORIGIN,
    })

    expect(mockSignOut).not.toHaveBeenCalled()
    expect(result.redirectTo).toBe(`${ORIGIN}/reset-password`)
  })

  it("invalid/expired token → redirect /auth/confirm-error", async () => {
    mockVerifyOtp.mockResolvedValue({ error: new Error("Token expired") })

    const result = await handleConfirm({
      token_hash: "badtoken",
      type: "email",
      next: null,
      origin: ORIGIN,
    })

    expect(result.redirectTo).toBe(`${ORIGIN}/auth/confirm-error`)
  })

  it("missing token_hash → redirect /auth/confirm-error (no verifyOtp call)", async () => {
    const result = await handleConfirm({
      token_hash: null,
      type: "email",
      next: null,
      origin: ORIGIN,
    })

    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(result.redirectTo).toBe(`${ORIGIN}/auth/confirm-error`)
  })

  it("invalid type → redirect /auth/confirm-error (no verifyOtp call)", async () => {
    const result = await handleConfirm({
      token_hash: "abc123",
      type: "unknown_type",
      next: null,
      origin: ORIGIN,
    })

    expect(mockVerifyOtp).not.toHaveBeenCalled()
    expect(result.redirectTo).toBe(`${ORIGIN}/auth/confirm-error`)
  })

  it("type=email_change with valid next path → next path used (session preserved)", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "email_change",
      next: "/dashboard",
      origin: ORIGIN,
    })

    expect(mockSignOut).not.toHaveBeenCalled()
    expect(result.redirectTo).toBe(`${ORIGIN}/dashboard`)
  })

  it("type=email_change with external next (open redirect) → ignored, defaults to /dashboard/perfil", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "email_change",
      next: "https://evil.com",
      origin: ORIGIN,
    })

    expect(result.redirectTo).toBe(`${ORIGIN}/dashboard/perfil`)
  })

  it("type=email: next param is ignored (always redirects to /auth/confirmed)", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "email",
      next: "/dashboard",
      origin: ORIGIN,
    })

    // signup confirmation always goes to /auth/confirmed regardless of next
    expect(result.redirectTo).toBe(`${ORIGIN}/auth/confirmed`)
  })

  it("token_hash is NOT included in any redirect URL", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "supersecret_hash",
      type: "email",
      next: null,
      origin: ORIGIN,
    })

    expect(result.redirectTo).not.toContain("supersecret_hash")
    expect(result.redirectTo).not.toContain("token_hash")
  })
})
