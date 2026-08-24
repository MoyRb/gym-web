import { describe, it, expect, vi, afterEach } from "vitest"
import { isStandalone, isIOS, isAndroid } from "@/lib/pwa/install"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("PWA install helpers (section 29)", () => {
  describe("isStandalone", () => {
    it("returns false when window is undefined (SSR)", () => {
      // In node environment window is always undefined — no stub needed
      expect(isStandalone()).toBe(false)
    })

    it("returns true when display-mode is standalone", () => {
      vi.stubGlobal("window", { matchMedia: vi.fn().mockReturnValue({ matches: true }) })
      expect(isStandalone()).toBe(true)
    })

    it("returns false when display-mode is browser", () => {
      vi.stubGlobal("window", { matchMedia: vi.fn().mockReturnValue({ matches: false }) })
      expect(isStandalone()).toBe(false)
    })

    it("calls matchMedia with correct query", () => {
      const matchMedia = vi.fn().mockReturnValue({ matches: false })
      vi.stubGlobal("window", { matchMedia })
      isStandalone()
      expect(matchMedia).toHaveBeenCalledWith("(display-mode: standalone)")
    })
  })

  describe("isIOS", () => {
    const setUA = (ua: string) => vi.stubGlobal("navigator", { userAgent: ua })

    it("returns false when navigator is undefined (SSR)", () => {
      // node environment has no navigator — already undefined
      expect(isIOS()).toBe(false)
    })

    it("returns true for iPhone UA", () => {
      setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")
      expect(isIOS()).toBe(true)
    })

    it("returns true for iPad UA", () => {
      setUA("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")
      expect(isIOS()).toBe(true)
    })

    it("returns true for iPod UA", () => {
      setUA("Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)")
      expect(isIOS()).toBe(true)
    })

    it("returns false for Android UA", () => {
      setUA("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile")
      expect(isIOS()).toBe(false)
    })

    it("returns false for desktop Chrome UA", () => {
      setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0")
      expect(isIOS()).toBe(false)
    })

    it("is case-insensitive", () => {
      setUA("IPHONE/test")
      expect(isIOS()).toBe(true)
    })
  })

  describe("isAndroid", () => {
    const setUA = (ua: string) => vi.stubGlobal("navigator", { userAgent: ua })

    it("returns false when navigator is undefined (SSR)", () => {
      expect(isAndroid()).toBe(false)
    })

    it("returns true for Android UA", () => {
      setUA("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile")
      expect(isAndroid()).toBe(true)
    })

    it("returns false for iPhone UA", () => {
      setUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")
      expect(isAndroid()).toBe(false)
    })

    it("returns false for desktop UA", () => {
      setUA("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0")
      expect(isAndroid()).toBe(false)
    })

    it("is case-insensitive", () => {
      setUA("ANDROID/test")
      expect(isAndroid()).toBe(true)
    })
  })
})
