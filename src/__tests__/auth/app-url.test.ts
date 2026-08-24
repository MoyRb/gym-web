import { describe, it, expect } from "vitest"
import { isSafeRedirectPath } from "@/lib/auth/app-url"

describe("isSafeRedirectPath", () => {
  it("accepts internal relative paths", () => {
    expect(isSafeRedirectPath("/dashboard")).toBe(true)
    expect(isSafeRedirectPath("/dashboard/perfil")).toBe(true)
    expect(isSafeRedirectPath("/auth/confirm")).toBe(true)
  })

  it("rejects protocol-relative URLs (open redirect via //)", () => {
    expect(isSafeRedirectPath("//evil.com")).toBe(false)
    expect(isSafeRedirectPath("//evil.com/steal")).toBe(false)
  })

  it("rejects absolute URLs", () => {
    expect(isSafeRedirectPath("https://evil.com")).toBe(false)
    expect(isSafeRedirectPath("http://evil.com")).toBe(false)
  })

  it("rejects empty string and non-strings", () => {
    expect(isSafeRedirectPath("")).toBe(false)
    expect(isSafeRedirectPath(null as unknown as string)).toBe(false)
    expect(isSafeRedirectPath(undefined as unknown as string)).toBe(false)
  })
})
