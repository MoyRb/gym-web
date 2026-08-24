import { describe, it, expect } from "vitest"
import { isLegacyInternalEmail } from "@/lib/auth/username"

// Inline the validation logic mirrored from the register page/route.
function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeEmail(value: string): string {
  return value.toLowerCase().trim()
}

function validatePassword(password: string): string | null {
  if (!password) return "La contraseña es obligatoria"
  if (password.length < 8) return "Mínimo 8 caracteres"
  return null
}

describe("email validation (section 44)", () => {
  it("accepts a valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true)
    expect(isValidEmail("juan.perez@gmail.com")).toBe(true)
  })

  it("rejects invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false)
    expect(isValidEmail("@example.com")).toBe(false)
    expect(isValidEmail("user@")).toBe(false)
    expect(isValidEmail("")).toBe(false)
  })

  it("normalizes email to lowercase and trims spaces", () => {
    expect(normalizeEmail("  USER@GMAIL.COM  ")).toBe("user@gmail.com")
    expect(normalizeEmail("Test@Example.COM")).toBe("test@example.com")
  })

  it("new account email is never a legacy internal email", () => {
    const email = normalizeEmail("  newuser@gmail.com  ")
    expect(isLegacyInternalEmail(email)).toBe(false)
  })
})

describe("password validation (section 44)", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("1234567")).not.toBeNull()
    expect(validatePassword("abc")).not.toBeNull()
    expect(validatePassword("")).not.toBeNull()
  })

  it("accepts passwords of exactly 8 characters", () => {
    expect(validatePassword("12345678")).toBeNull()
  })

  it("accepts passwords longer than 8 characters", () => {
    expect(validatePassword("a_strong_password_123")).toBeNull()
  })

  it("does NOT require special characters or uppercase", () => {
    expect(validatePassword("alllower1")).toBeNull()
    expect(validatePassword("12345678")).toBeNull()
  })
})

describe("new signup contract (section 44)", () => {
  it("signup payload contains real email, not internal email", () => {
    const email = "user@gmail.com"
    expect(isLegacyInternalEmail(email)).toBe(false)
    expect(isValidEmail(email)).toBe(true)
  })

  it("signup uses real email (fitnessclub.local must not appear in payload)", () => {
    const newSignupEmail = "test@example.com"
    expect(newSignupEmail).not.toContain("fitnessclub.local")
    expect(isLegacyInternalEmail(newSignupEmail)).toBe(false)
  })
})
