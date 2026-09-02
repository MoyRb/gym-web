import { describe, it, expect } from "vitest"

// ─── Landing PricingSection ───────────────────────────────────────────────────

describe("landing PricingSection — CTA hrefs", () => {
  it("Free CTA points to /register", async () => {
    const { LANDING_FREE_CTA_HREF } = await import(
      "@/components/landing/PricingSection"
    )
    expect(LANDING_FREE_CTA_HREF).toBe("/register")
  })

  it("Pro CTA points to /pricing (not to checkout directly)", async () => {
    const { LANDING_PRO_CTA_HREF } = await import(
      "@/components/landing/PricingSection"
    )
    expect(LANDING_PRO_CTA_HREF).toBe("/pricing")
  })

  it("Pro CTA does not hardcode a checkout or Stripe URL", async () => {
    const { LANDING_PRO_CTA_HREF } = await import(
      "@/components/landing/PricingSection"
    )
    expect(LANDING_PRO_CTA_HREF).not.toContain("stripe")
    expect(LANDING_PRO_CTA_HREF).not.toContain("checkout")
    expect(LANDING_PRO_CTA_HREF).not.toContain("http")
  })
})

// ─── Pricing page — feature arrays ───────────────────────────────────────────

describe("pricing page — feature lists", () => {
  it("FREE_FEATURES contains manual routines", async () => {
    const { FREE_FEATURES } = await import("@/app/pricing/page")
    const joined = FREE_FEATURES.join(" ")
    expect(joined.toLowerCase()).toContain("manual")
  })

  it("PRO_FEATURES contains AI quota benefit", async () => {
    const { PRO_FEATURES } = await import("@/app/pricing/page")
    const joined = PRO_FEATURES.join(" ")
    // Pro should mention IA/AI
    expect(joined.toLowerCase()).toMatch(/ia|ai|generaci/i)
  })

  it("PRO_FEATURES includes sin anuncios", async () => {
    const { PRO_FEATURES } = await import("@/app/pricing/page")
    const joined = PRO_FEATURES.join(" ").toLowerCase()
    expect(joined).toContain("anuncio")
  })

  it("FREE_CAVEATS uses neutral ad copy (not 'próximamente' for existing feature)", async () => {
    const { FREE_CAVEATS } = await import("@/app/pricing/page")
    const joined = FREE_CAVEATS.join(" ").toLowerCase()
    // Must not say the plan Pro is "coming soon" (it's available)
    expect(joined).not.toContain("próximamente")
    // Should mention publicidad/anuncio factually
    expect(joined).toMatch(/publicidad|anuncio/i)
  })
})

// ─── Pricing page — no obsolete FAQ ──────────────────────────────────────────

describe("pricing page metadata — no obsolete copy", () => {
  it("metadata description does not say Pro is coming soon", async () => {
    const mod = await import("@/app/pricing/page")
    const desc = (mod as { metadata?: { description?: string } }).metadata?.description ?? ""
    expect(desc.toLowerCase()).not.toContain("próximamente")
  })
})
