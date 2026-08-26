import { describe, it, expect } from "vitest"
import sitemap from "@/app/sitemap"

describe("sitemap", () => {
  const entries = sitemap()
  const urls = entries.map((e) => e.url)

  it("includes public indexable pages", () => {
    expect(urls).toContain("https://alphatrainer.net")
    expect(urls).toContain("https://alphatrainer.net/pricing")
    expect(urls).toContain("https://alphatrainer.net/privacidad")
    expect(urls).toContain("https://alphatrainer.net/terminos")
    expect(urls).toContain("https://alphatrainer.net/seguridad")
    expect(urls).toContain("https://alphatrainer.net/soporte")
    expect(urls).toContain("https://alphatrainer.net/eliminar-cuenta")
  })

  it("does not include dashboard routes", () => {
    expect(urls.some((u) => u.includes("/dashboard"))).toBe(false)
  })

  it("does not include auth routes", () => {
    const authPaths = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/auth/"]
    for (const path of authPaths) {
      expect(urls.some((u) => u.includes(path))).toBe(false)
    }
  })

  it("does not include api routes", () => {
    expect(urls.some((u) => u.includes("/api/"))).toBe(false)
  })

  it("does not include admin routes", () => {
    expect(urls.some((u) => u.includes("/admin"))).toBe(false)
  })

  it("all URLs use alphatrainer.net", () => {
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/alphatrainer\.net/)
    }
  })

  it("does not use dynamic lastModified (new Date())", () => {
    // All entries should omit lastModified — using dynamic new Date() causes
    // search engines to think every page changed on every request/build.
    for (const entry of entries) {
      expect(entry.lastModified).toBeUndefined()
    }
  })
})
