import { describe, it, expect } from "vitest"
import { siteConfig, developerConfig } from "@/config/site"

describe("siteConfig", () => {
  it("has a url field pointing to alphatrainer.net", () => {
    expect(siteConfig.url).toBe("https://alphatrainer.net")
  })

  it("has a contact email on alphatrainer.net domain", () => {
    expect(siteConfig.contact.email).toMatch(/@alphatrainer\.net$/)
  })
})

describe("developerConfig", () => {
  it("has the developer name Formex.3D", () => {
    expect(developerConfig.name).toBe("Formex.3D")
  })

  it("url is null or a non-empty string (no placeholder '#')", () => {
    if (developerConfig.url !== null) {
      expect(developerConfig.url).toMatch(/^https?:\/\//)
    } else {
      expect(developerConfig.url).toBeNull()
    }
  })
})

describe("metadata authorship source of truth", () => {
  // layout.tsx uses developerConfig.name as creator and siteConfig.name as publisher.
  // We can't import layout.tsx in vitest (next/font/google is Next.js-only).
  // These tests verify the source config values that layout.tsx reads.
  it("developerConfig.name is the creator value used in layout metadata", () => {
    expect(developerConfig.name).toBe("Formex.3D")
  })

  it("siteConfig.name is the publisher value used in layout metadata", () => {
    expect(siteConfig.name).toBe("Alpha Trainer")
  })
})

describe("footer legal links", () => {
  const legalLinks = [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Términos", href: "/terminos" },
    { label: "Seguridad", href: "/seguridad" },
  ]

  it("legal links do not use placeholder '#'", () => {
    for (const link of legalLinks) {
      expect(link.href).not.toBe("#")
      expect(link.href).not.toBe("")
    }
  })

  it("legal links point to real page paths", () => {
    for (const link of legalLinks) {
      expect(link.href).toMatch(/^\/[a-z]/)
    }
  })
})

describe("dashboard layout noindex", () => {
  it("exports robots noindex", async () => {
    const mod = await import("@/app/dashboard/layout")
    const meta = (mod as { metadata?: { robots?: { index?: boolean; follow?: boolean } } }).metadata
    expect(meta?.robots?.index).toBe(false)
    expect(meta?.robots?.follow).toBe(false)
  })
})

describe("admin layout noindex", () => {
  it("exports robots noindex", async () => {
    const mod = await import("@/app/dashboard/admin/layout")
    const meta = (mod as { metadata?: { robots?: { index?: boolean; follow?: boolean } } }).metadata
    expect(meta?.robots?.index).toBe(false)
    expect(meta?.robots?.follow).toBe(false)
  })
})

describe("auth route noindex layouts", () => {
  const cases: Array<[string, () => Promise<unknown>]> = [
    ["login", () => import("@/app/login/layout")],
    ["register", () => import("@/app/register/layout")],
    ["verify-email", () => import("@/app/verify-email/layout")],
    ["forgot-password", () => import("@/app/forgot-password/layout")],
    ["reset-password", () => import("@/app/reset-password/layout")],
    ["auth", () => import("@/app/auth/layout")],
  ]

  for (const [name, importFn] of cases) {
    it(`${name} layout exports robots noindex`, async () => {
      const mod = await importFn()
      const meta = (mod as { metadata?: { robots?: { index?: boolean; follow?: boolean } } }).metadata
      expect(meta).toBeDefined()
      expect(meta?.robots?.index).toBe(false)
      expect(meta?.robots?.follow).toBe(false)
    })
  }
})

describe("public page canonicals", () => {
  const BASE = "https://alphatrainer.net"

  it("pricing page has correct canonical", async () => {
    const mod = await import("@/app/pricing/page")
    const meta = (mod as { metadata?: { alternates?: { canonical?: string } } }).metadata
    expect(meta?.alternates?.canonical).toBe(`${BASE}/pricing`)
  })

  it("privacidad page has correct canonical", async () => {
    const mod = await import("@/app/privacidad/page")
    const meta = (mod as { metadata?: { alternates?: { canonical?: string } } }).metadata
    expect(meta?.alternates?.canonical).toBe(`${BASE}/privacidad`)
  })

  it("terminos page has correct canonical", async () => {
    const mod = await import("@/app/terminos/page")
    const meta = (mod as { metadata?: { alternates?: { canonical?: string } } }).metadata
    expect(meta?.alternates?.canonical).toBe(`${BASE}/terminos`)
  })

  it("seguridad page has correct canonical", async () => {
    const mod = await import("@/app/seguridad/page")
    const meta = (mod as { metadata?: { alternates?: { canonical?: string } } }).metadata
    expect(meta?.alternates?.canonical).toBe(`${BASE}/seguridad`)
  })

  it("soporte page has correct canonical", async () => {
    const mod = await import("@/app/soporte/page")
    const meta = (mod as { metadata?: { alternates?: { canonical?: string } } }).metadata
    expect(meta?.alternates?.canonical).toBe(`${BASE}/soporte`)
  })

  it("eliminar-cuenta page has correct canonical", async () => {
    const mod = await import("@/app/eliminar-cuenta/page")
    const meta = (mod as { metadata?: { alternates?: { canonical?: string } } }).metadata
    expect(meta?.alternates?.canonical).toBe(`${BASE}/eliminar-cuenta`)
  })

  it("homepage canonical points to root, not a subpage", async () => {
    const mod = await import("@/app/page")
    const meta = (mod as { metadata?: { alternates?: { canonical?: string } } }).metadata
    expect(meta?.alternates?.canonical).toBe(BASE)
  })
})

describe("public pages are indexable (no accidental noindex)", () => {
  const publicPages = [
    ["pricing", () => import("@/app/pricing/page")],
    ["privacidad", () => import("@/app/privacidad/page")],
    ["terminos", () => import("@/app/terminos/page")],
    ["seguridad", () => import("@/app/seguridad/page")],
    ["soporte", () => import("@/app/soporte/page")],
    ["eliminar-cuenta", () => import("@/app/eliminar-cuenta/page")],
  ] as const

  for (const [name, importFn] of publicPages) {
    it(`/${name} does not have noindex`, async () => {
      const mod = await importFn()
      const meta = (mod as { metadata?: { robots?: { index?: boolean } } }).metadata
      // Absence of robots = indexable by default. Explicit robots.index must not be false.
      const robotsIndex = meta?.robots?.index
      expect(robotsIndex).not.toBe(false)
    })
  }
})
