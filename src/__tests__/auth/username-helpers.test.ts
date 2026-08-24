import { describe, it, expect } from "vitest"
import {
  isLegacyInternalEmail,
  accountHasVerifiedRealEmail,
  usernameToInternalEmail,
  normalizeUsername,
} from "@/lib/auth/username"

describe("isLegacyInternalEmail", () => {
  it("returns true for @fitnessclub.local emails", () => {
    expect(isLegacyInternalEmail("juan@fitnessclub.local")).toBe(true)
    expect(isLegacyInternalEmail("john.doe@fitnessclub.local")).toBe(true)
  })

  it("returns false for real email addresses", () => {
    expect(isLegacyInternalEmail("user@gmail.com")).toBe(false)
    expect(isLegacyInternalEmail("user@alphatrainer.net")).toBe(false)
    expect(isLegacyInternalEmail("user@example.com")).toBe(false)
  })

  it("usernameToInternalEmail produces a legacy email", () => {
    const internal = usernameToInternalEmail(normalizeUsername("testuser"))
    expect(isLegacyInternalEmail(internal)).toBe(true)
  })
})

describe("accountHasVerifiedRealEmail", () => {
  const confirmedAt = "2026-08-01T00:00:00.000Z"

  it("returns true for real email + confirmed", () => {
    expect(
      accountHasVerifiedRealEmail({ email: "user@gmail.com", email_confirmed_at: confirmedAt }),
    ).toBe(true)
  })

  it("returns false for legacy internal email even if confirmed", () => {
    expect(
      accountHasVerifiedRealEmail({
        email: "user@fitnessclub.local",
        email_confirmed_at: confirmedAt,
      }),
    ).toBe(false)
  })

  it("returns false for real email not yet confirmed", () => {
    expect(
      accountHasVerifiedRealEmail({ email: "user@gmail.com", email_confirmed_at: null }),
    ).toBe(false)
  })

  it("returns false when email is null", () => {
    expect(
      accountHasVerifiedRealEmail({ email: null, email_confirmed_at: confirmedAt }),
    ).toBe(false)
  })

  it("returns false when both are null", () => {
    expect(accountHasVerifiedRealEmail({ email: null, email_confirmed_at: null })).toBe(false)
  })
})
