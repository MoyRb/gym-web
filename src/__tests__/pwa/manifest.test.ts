import { describe, it, expect } from "vitest"
import manifest from "@/app/manifest"

describe("PWA manifest (section 30)", () => {
  const m = manifest()

  it("name is Alpha Trainer", () => {
    expect(m.name).toBe("Alpha Trainer")
  })

  it("short_name is Alpha Trainer", () => {
    expect(m.short_name).toBe("Alpha Trainer")
  })

  it("does NOT contain legacy fitness-club references", () => {
    const json = JSON.stringify(m)
    expect(json).not.toContain("fitness-club")
    expect(json).not.toContain("fitness_club")
    expect(json).not.toContain("fitnessclub")
  })

  it("start_url is /", () => {
    expect(m.start_url).toBe("/")
  })

  it("display is standalone", () => {
    expect(m.display).toBe("standalone")
  })

  it("background_color uses brand dark", () => {
    expect(m.background_color).toBe("#0A0A0B")
  })

  it("has at least 3 icons (192, 512, maskable)", () => {
    expect(m.icons?.length).toBeGreaterThanOrEqual(3)
  })

  it("has 192x192 icon with purpose=any", () => {
    const icon = m.icons?.find((i) => i.sizes === "192x192")
    expect(icon).toBeDefined()
    expect(icon?.src).toContain("alpha-trainer")
    expect(icon?.type).toBe("image/png")
    expect(icon?.purpose).toBe("any")
  })

  it("has 512x512 icon with purpose=any", () => {
    const icon = m.icons?.find((i) => i.sizes === "512x512" && i.purpose === "any")
    expect(icon).toBeDefined()
    expect(icon?.src).toContain("alpha-trainer")
  })

  it("has maskable 512x512 icon", () => {
    const maskable = m.icons?.find((i) => i.purpose === "maskable")
    expect(maskable).toBeDefined()
    expect(maskable?.sizes).toBe("512x512")
    expect(maskable?.src).toContain("alpha-trainer")
  })

  it("no icon references old fitness-club-icon.svg", () => {
    m.icons?.forEach((icon) => {
      expect(icon.src).not.toContain("fitness-club")
    })
  })

  it("has lang=es", () => {
    expect(m.lang).toBe("es")
  })
})
