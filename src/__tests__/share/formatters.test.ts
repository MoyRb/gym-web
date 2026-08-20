import { describe, expect, it } from "vitest"
import {
  canShareFiles,
  formatShareDate,
  formatShareDuration,
  formatShareVolumeNumber,
  formatShareVolumeDisplay,
  getShareFilename,
  isWebShareSupported,
} from "@/components/share/formatters"

// ── Duration ──────────────────────────────────────────────────────────────────

describe("formatShareDuration", () => {
  it("returns 0 MIN for zero seconds", () => {
    expect(formatShareDuration(0)).toBe("0 MIN")
  })

  it("returns 0 MIN for negative input", () => {
    expect(formatShareDuration(-10)).toBe("0 MIN")
  })

  it("returns seconds label for < 1 minute", () => {
    expect(formatShareDuration(42)).toBe("42 SEG")
  })

  it("returns minutes for exact minutes", () => {
    expect(formatShareDuration(300)).toBe("5 MIN")
  })

  it("returns minutes for 42 min", () => {
    expect(formatShareDuration(2520)).toBe("42 MIN")
  })

  it("returns hours+minutes for > 1 hour", () => {
    expect(formatShareDuration(3661)).toBe("1h 01min")
  })

  it("pads minutes < 10 in hour format", () => {
    expect(formatShareDuration(3600 + 5 * 60)).toBe("1h 05min")
  })

  it("handles exactly 1 hour", () => {
    expect(formatShareDuration(3600)).toBe("1h 00min")
  })
})

// ── Volume ────────────────────────────────────────────────────────────────────

describe("formatShareVolumeNumber", () => {
  it("returns 0 for zero kg", () => {
    expect(formatShareVolumeNumber(0)).toBe("0")
  })

  it("returns 0 for negative kg", () => {
    expect(formatShareVolumeNumber(-10)).toBe("0")
  })

  it("rounds decimals", () => {
    const result = formatShareVolumeNumber(8450.46)
    // Contains "8450" or "8.450" or "8,450" depending on locale — just check digit content
    expect(result.replace(/[^0-9]/g, "")).toBe("8450")
  })

  it("handles small volume", () => {
    const result = formatShareVolumeNumber(100)
    expect(result.replace(/[^0-9]/g, "")).toBe("100")
  })

  it("handles large volume", () => {
    const result = formatShareVolumeNumber(15000)
    expect(result.replace(/[^0-9]/g, "")).toBe("15000")
  })
})

describe("formatShareVolumeDisplay", () => {
  it("returns null for zero volume", () => {
    expect(formatShareVolumeDisplay(0)).toBeNull()
  })

  it("returns null for negative volume", () => {
    expect(formatShareVolumeDisplay(-1)).toBeNull()
  })

  it("returns formatted string for positive volume", () => {
    const result = formatShareVolumeDisplay(1500)
    expect(result).not.toBeNull()
    expect(result!.replace(/[^0-9]/g, "")).toBe("1500")
  })
})

// ── Date ──────────────────────────────────────────────────────────────────────

describe("formatShareDate", () => {
  it("returns uppercase string with year", () => {
    const d = new Date("2026-08-19T10:00:00Z")
    const result = formatShareDate(d)
    expect(result).toMatch(/2026/)
    expect(result).toBe(result.toUpperCase())
  })

  it("does not crash on epoch date", () => {
    expect(() => formatShareDate(new Date(0))).not.toThrow()
  })
})

// ── Filename ──────────────────────────────────────────────────────────────────

describe("getShareFilename", () => {
  it("includes the date in YYYY-MM-DD format", () => {
    const d = new Date("2026-08-19T10:00:00Z")
    const filename = getShareFilename(d)
    expect(filename).toContain("2026")
    expect(filename).toMatch(/alpha-trainer-workout-\d{4}-\d{2}-\d{2}\.png/)
  })

  it("always ends in .png", () => {
    expect(getShareFilename(new Date())).toMatch(/\.png$/)
  })

  it("starts with alpha-trainer-workout", () => {
    expect(getShareFilename(new Date())).toMatch(/^alpha-trainer-workout-/)
  })
})

// ── Web Share API detection ───────────────────────────────────────────────────

describe("isWebShareSupported", () => {
  it("returns false in Node.js test environment (no navigator)", () => {
    // In vitest node environment, navigator is undefined
    expect(isWebShareSupported()).toBe(false)
  })
})

describe("canShareFiles", () => {
  it("returns false in Node.js test environment", () => {
    expect(canShareFiles()).toBe(false)
  })
})
