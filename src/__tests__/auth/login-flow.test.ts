import { describe, it, expect } from "vitest"
import { usernameToInternalEmail, normalizeUsername, isLegacyInternalEmail } from "@/lib/auth/username"

// Mirror the login email resolution logic from the login page
function resolveLoginEmail(isLegacyMode: boolean, email: string, username: string): string {
  if (isLegacyMode) {
    return usernameToInternalEmail(normalizeUsername(username))
  }
  return email.toLowerCase().trim()
}

describe("login email resolution (section 46)", () => {
  it("real email login: uses the provided email directly", () => {
    const result = resolveLoginEmail(false, "user@gmail.com", "")
    expect(result).toBe("user@gmail.com")
    expect(isLegacyInternalEmail(result)).toBe(false)
  })

  it("real email login: normalizes to lowercase", () => {
    const result = resolveLoginEmail(false, "USER@GMAIL.COM", "")
    expect(result).toBe("user@gmail.com")
  })

  it("legacy username login: converts to fitnessclub.local email", () => {
    const result = resolveLoginEmail(true, "", "juan.perez")
    expect(result).toBe("juan.perez@fitnessclub.local")
    expect(isLegacyInternalEmail(result)).toBe(true)
  })

  it("legacy username login: normalizes the username", () => {
    const result = resolveLoginEmail(true, "", "  JUAN.PEREZ  ")
    expect(result).toBe("juan.perez@fitnessclub.local")
  })

  it("legacy behavior unchanged: same output as before CORTE AUTH 2", () => {
    // This must match the original usernameToInternalEmail behavior exactly.
    const legacy = usernameToInternalEmail("axeleac")
    expect(legacy).toBe("axeleac@fitnessclub.local")
  })
})

describe("unconfirmed email detection (section 46)", () => {
  it("detects 'email not confirmed' error (lowercase)", () => {
    const errorMsg = "email not confirmed"
    const isUnconfirmed =
      errorMsg.toLowerCase().includes("email not confirmed") ||
      errorMsg.toLowerCase().includes("email_not_confirmed")
    expect(isUnconfirmed).toBe(true)
  })

  it("detects 'Email Not Confirmed' error (mixed case)", () => {
    const errorMsg = "Email Not Confirmed"
    const isUnconfirmed =
      errorMsg.toLowerCase().includes("email not confirmed") ||
      errorMsg.toLowerCase().includes("email_not_confirmed")
    expect(isUnconfirmed).toBe(true)
  })

  it("does NOT treat wrong-password as unconfirmed", () => {
    const errorMsg = "Invalid login credentials"
    const isUnconfirmed =
      errorMsg.toLowerCase().includes("email not confirmed") ||
      errorMsg.toLowerCase().includes("email_not_confirmed")
    expect(isUnconfirmed).toBe(false)
  })
})
