/**
 * Tests for GET /r/[code] referral route.
 *
 * Verifies:
 *  - Valid active code → sets cookie → redirects to /pricing
 *  - Inactive code → no cookie → redirects to /pricing
 *  - Invalid/unknown code → no cookie → redirects to /pricing
 *  - Unsafe characters are stripped from code
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockFrom, mockCookiesSet, mockCookiesGet, mockTrack, mockCookieStore } = vi.hoisted(() => {
  const mockCookiesSet = vi.fn()
  const mockCookiesGet = vi.fn()
  return {
    mockFrom: vi.fn(),
    mockCookiesSet,
    mockCookiesGet,
    mockTrack: vi.fn().mockResolvedValue(undefined),
    mockCookieStore: { set: mockCookiesSet, get: mockCookiesGet, delete: vi.fn() },
  }
})

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

vi.mock("@/lib/analytics/server", () => ({
  trackServerEvent: mockTrack,
}))

vi.mock("next/server", () => ({
  NextResponse: {
    redirect: vi.fn().mockImplementation((url: URL) => ({
      status: 302,
      headers: new Headers({ Location: url.toString() }),
      _redirectUrl: url.toString(),
    })),
  },
}))

function makeQueryChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "maybeSingle"]
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain) })
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: result })
  return chain
}

import { GET } from "@/app/r/[code]/route"

const makeContext = (code: string) => ({
  params: Promise.resolve({ code }),
})

const makeRequest = (code: string) =>
  new Request(`https://alphatrainer.net/r/${code}`)

beforeEach(() => {
  vi.clearAllMocks()
  mockTrack.mockResolvedValue(undefined)
})

describe("GET /r/[code] — valid active partner", () => {
  it("sets alpha_ref cookie and redirects to /pricing", async () => {
    const chain = makeQueryChain({ id: "partner-uuid", status: "active" })
    mockFrom.mockReturnValue(chain)

    const res = await GET(makeRequest("POWERFIT"), makeContext("POWERFIT"))

    expect(mockCookiesSet).toHaveBeenCalledWith(
      "alpha_ref",
      "POWERFIT",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    )
    expect((res as unknown as { _redirectUrl: string })._redirectUrl).toContain("/pricing")
  })

  it("normalizes lowercase code to uppercase before setting cookie", async () => {
    const chain = makeQueryChain({ id: "partner-uuid", status: "active" })
    mockFrom.mockReturnValue(chain)

    await GET(makeRequest("powerfit"), makeContext("powerfit"))

    expect(mockCookiesSet).toHaveBeenCalledWith(
      "alpha_ref",
      "POWERFIT",
      expect.anything(),
    )
  })
})

describe("GET /r/[code] — inactive partner", () => {
  it("does NOT set cookie, still redirects to /pricing", async () => {
    const chain = makeQueryChain({ id: "partner-uuid", status: "inactive" })
    mockFrom.mockReturnValue(chain)

    const res = await GET(makeRequest("INACTIVE"), makeContext("INACTIVE"))

    expect(mockCookiesSet).not.toHaveBeenCalled()
    expect((res as unknown as { _redirectUrl: string })._redirectUrl).toContain("/pricing")
  })
})

describe("GET /r/[code] — unknown code", () => {
  it("does NOT set cookie, still redirects to /pricing", async () => {
    const chain = makeQueryChain(null)
    mockFrom.mockReturnValue(chain)

    const res = await GET(makeRequest("UNKNOWN"), makeContext("UNKNOWN"))

    expect(mockCookiesSet).not.toHaveBeenCalled()
    expect((res as unknown as { _redirectUrl: string })._redirectUrl).toContain("/pricing")
  })
})

describe("GET /r/[code] — unsafe characters", () => {
  it("strips non-alphanumeric chars from code", async () => {
    const chain = makeQueryChain(null)
    mockFrom.mockReturnValue(chain)

    // After stripping: "SAFE" (4 chars) — valid length
    await GET(makeRequest("SAFE--INJECT"), makeContext("SAFE--INJECT"))

    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls
    const codeArg = eqCalls.find((call: unknown[]) => call[0] === "code")?.[1]
    // Should have been stripped of "--" → "SAFEINJECT"
    expect(typeof codeArg).toBe("string")
    expect(codeArg).not.toContain("-")
  })

  it("empty code after stripping redirects to /pricing without cookie", async () => {
    const chain = makeQueryChain(null)
    mockFrom.mockReturnValue(chain)

    // A single char after normalization would be too short
    const res = await GET(makeRequest("!"), makeContext("!"))
    expect(mockCookiesSet).not.toHaveBeenCalled()
    expect((res as unknown as { _redirectUrl: string })._redirectUrl).toContain("/pricing")
  })
})
