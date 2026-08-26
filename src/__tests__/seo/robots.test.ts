import { describe, it, expect } from "vitest"
import robots from "@/app/robots"

describe("robots", () => {
  const result = robots()

  it("references the sitemap", () => {
    expect(result.sitemap).toBe("https://alphatrainer.net/sitemap.xml")
  })

  it("has at least one rule", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    expect(rules.length).toBeGreaterThan(0)
  })

  it("disallows dashboard crawling", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallows = rules.flatMap((r) => {
      const d = r.disallow
      return Array.isArray(d) ? d : d ? [d] : []
    })
    expect(disallows.some((d) => d.startsWith("/dashboard"))).toBe(true)
  })

  it("disallows api crawling", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallows = rules.flatMap((r) => {
      const d = r.disallow
      return Array.isArray(d) ? d : d ? [d] : []
    })
    expect(disallows.some((d) => d.startsWith("/api"))).toBe(true)
  })

  it("disallows private auth routes", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallows = rules.flatMap((r) => {
      const d = r.disallow
      return Array.isArray(d) ? d : d ? [d] : []
    })
    const privateRoutes = ["/auth/", "/login", "/register", "/verify-email", "/forgot-password", "/reset-password"]
    for (const route of privateRoutes) {
      expect(disallows.some((d) => d === route || d.startsWith(route))).toBe(true)
    }
  })
})
