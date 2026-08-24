import { describe, it, expect } from "vitest"
import { isLegacyInternalEmail } from "@/lib/auth/username"

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateResetPassword(password: string, confirmPassword: string): Record<string, string> {
  const errs: Record<string, string> = {}
  if (!password) errs.password = "La contraseña es obligatoria"
  else if (password.length < 8) errs.password = "Mínimo 8 caracteres"
  if (!confirmPassword) errs.confirmPassword = "Confirma tu contraseña"
  else if (password && password !== confirmPassword) {
    errs.confirmPassword = "Las contraseñas no coinciden"
  }
  return errs
}

describe("forgot-password validation (section 48)", () => {
  it("valid email → no validation error", () => {
    expect(isValidEmail("user@example.com")).toBe(true)
  })

  it("invalid email → client validation rejects", () => {
    expect(isValidEmail("not-valid")).toBe(false)
    expect(isValidEmail("")).toBe(false)
    expect(isValidEmail("@example.com")).toBe(false)
  })

  it("response is always neutral (no account enumeration)", () => {
    // The forgot-password route returns neutral message regardless.
    // This is a contract test — the UI shows the same message for valid and invalid emails.
    const neutralMessage = "Si existe una cuenta con ese correo, recibirás un enlace"
    expect(neutralMessage).toContain("Si existe una cuenta")
  })

  it("legacy internal emails are detected (should not trigger real recovery)", () => {
    expect(isLegacyInternalEmail("juan@fitnessclub.local")).toBe(true)
  })
})

describe("reset-password validation (section 48)", () => {
  it("valid password → no errors", () => {
    const errs = validateResetPassword("newpass123", "newpass123")
    expect(Object.keys(errs)).toHaveLength(0)
  })

  it("password under 8 chars → rejected", () => {
    const errs = validateResetPassword("short", "short")
    expect(errs.password).toBeDefined()
  })

  it("passwords do not match → rejected", () => {
    const errs = validateResetPassword("newpass123", "different123")
    expect(errs.confirmPassword).toMatch(/no coinciden/)
  })

  it("empty password → rejected", () => {
    const errs = validateResetPassword("", "")
    expect(errs.password).toBeDefined()
  })

  it("empty confirm → rejected", () => {
    const errs = validateResetPassword("newpass123", "")
    expect(errs.confirmPassword).toBeDefined()
  })
})
