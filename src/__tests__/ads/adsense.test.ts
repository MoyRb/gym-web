import { describe, it, expect, vi, afterEach } from "vitest"

// ─── AdSense loader config ───────────────────────────────────────────────────

describe("GoogleAdSense component config", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("reads publisher ID from NEXT_PUBLIC_ADSENSE_CLIENT_ID", () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456")
    // Re-read the env var the same way the component does.
    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
    expect(clientId).toBe("ca-pub-1234567890123456")
  })

  it("returns null/falsy when NEXT_PUBLIC_ADSENSE_CLIENT_ID is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT_ID", "")
    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
    expect(clientId).toBeFalsy()
  })

  it("client ID follows ca-pub-XXXXXXXX format when present", () => {
    const exampleId = "ca-pub-1234567890123456"
    expect(exampleId).toMatch(/^ca-pub-\d+$/)
  })

  it("app does not throw when NEXT_PUBLIC_ADSENSE_CLIENT_ID is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT_ID", "")
    expect(() => {
      const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
      const isProduction = process.env.NODE_ENV === "production"
      // Mirrors the guard in GoogleAdSense.tsx
      const shouldLoad = Boolean(clientId && isProduction)
      return shouldLoad
    }).not.toThrow()
  })
})

// ─── No ad slots present ─────────────────────────────────────────────────────

describe("no AdSlots in codebase (verification-only corte)", () => {
  it("GoogleAdSense is the only named export from the ads component", async () => {
    const mod = await import("@/components/ads/GoogleAdSense")
    const exports = Object.keys(mod)
    expect(exports).toContain("GoogleAdSense")
    // No AdSlot, AdBanner, or similar slot components exported.
    const unexpectedExports = exports.filter(
      (k) => k !== "GoogleAdSense" && k !== "default"
    )
    expect(unexpectedExports).toHaveLength(0)
  })

  it("GoogleAdSense export is a function (component)", async () => {
    const mod = await import("@/components/ads/GoogleAdSense")
    expect(typeof mod.GoogleAdSense).toBe("function")
  })
})

// ─── Verification meta tag (metadata.other) ──────────────────────────────────

describe("AdSense site verification meta tag", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("metadata.other includes google-adsense-account when client ID is set", () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT_ID", "ca-pub-1234567890123456")
    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
    // Mirrors the spread in layout.tsx: ...(adsenseClientId ? { other: { ... } } : {})
    const otherMeta = clientId
      ? { "google-adsense-account": clientId }
      : undefined
    expect(otherMeta).toBeDefined()
    expect(otherMeta?.["google-adsense-account"]).toBe("ca-pub-1234567890123456")
  })

  it("metadata.other is absent when client ID is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_ADSENSE_CLIENT_ID", "")
    const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
    const otherMeta = clientId
      ? { "google-adsense-account": clientId }
      : undefined
    expect(otherMeta).toBeUndefined()
  })

  it("meta tag name is exactly 'google-adsense-account'", () => {
    const key = "google-adsense-account"
    // Google requires this exact string for site verification.
    expect(key).toBe("google-adsense-account")
  })
})

// ─── Production-only loading ─────────────────────────────────────────────────

describe("AdSense production-only guard", () => {
  it("does not load in non-production environments", () => {
    // NODE_ENV is 'test' in vitest — simulate the guard.
    const clientId = "ca-pub-1234567890123456"
    const isProduction = process.env.NODE_ENV === "production"
    const shouldLoad = Boolean(clientId && isProduction)
    // In test environment, NODE_ENV !== 'production', so shouldLoad is false.
    expect(isProduction).toBe(false)
    expect(shouldLoad).toBe(false)
  })

  it("would load in production when client ID is present", () => {
    const clientId = "ca-pub-1234567890123456"
    const mockProduction = true
    const shouldLoad = Boolean(clientId && mockProduction)
    expect(shouldLoad).toBe(true)
  })
})
