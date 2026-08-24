import { describe, it, expect, vi, beforeEach } from "vitest"
import { isSafeRedirectPath } from "@/lib/auth/app-url"

// Simulate the /auth/confirm route logic (token_hash + type → verifyOtp → redirect)

const { mockVerifyOtp, mockCreateClient } = vi.hoisted(() => {
  const mockVerifyOtp = vi.fn()
  const mockCreateClient = vi.fn(async () => ({
    auth: { verifyOtp: mockVerifyOtp },
  }))
  return { mockVerifyOtp, mockCreateClient }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}))

// Minimal route logic extracted for unit testing
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

  if (type === "recovery") {
    return { redirectTo: `${origin}/reset-password` }
  }

  const redirectPath = next && isSafeRedirectPath(next) ? next : "/dashboard/perfil"
  return { redirectTo: `${origin}${redirectPath}` }
}

const ORIGIN = "https://alphatrainer.net"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("/auth/confirm route logic (section 45)", () => {
  it("valid token_hash + type=email → verifyOtp called → redirect dashboard/perfil", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "email",
      next: null,
      origin: ORIGIN,
    })

    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: "abc123", type: "email" })
    expect(result.redirectTo).toBe(`${ORIGIN}/dashboard/perfil`)
  })

  it("valid token_hash + type=recovery → redirect /reset-password", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "recovery",
      next: null,
      origin: ORIGIN,
    })

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

  it("valid next path → used as redirect target", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "email",
      next: "/dashboard",
      origin: ORIGIN,
    })

    expect(result.redirectTo).toBe(`${ORIGIN}/dashboard`)
  })

  it("external next path (open redirect attempt) → ignored, defaults to /dashboard/perfil", async () => {
    mockVerifyOtp.mockResolvedValue({ error: null })

    const result = await handleConfirm({
      token_hash: "abc123",
      type: "email",
      next: "https://evil.com",
      origin: ORIGIN,
    })

    expect(result.redirectTo).toBe(`${ORIGIN}/dashboard/perfil`)
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
