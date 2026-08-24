import { describe, it, expect } from "vitest"
import { isLegacyInternalEmail, accountHasVerifiedRealEmail } from "@/lib/auth/username"

type MockUser = { email?: string | null; email_confirmed_at?: string | null }

function accountStatus(user: MockUser): "verified" | "pending" | "legacy" | "incomplete" {
  const { email, email_confirmed_at } = user
  if (!email) return "incomplete"
  if (isLegacyInternalEmail(email)) return "legacy"
  if (email_confirmed_at) return "verified"
  return "pending"
}

describe("account status derivation (section 49)", () => {
  it("real email + confirmed → verified", () => {
    expect(
      accountStatus({ email: "manuel@email.com", email_confirmed_at: "2026-08-01T00:00:00Z" }),
    ).toBe("verified")
    expect(
      accountHasVerifiedRealEmail({
        email: "manuel@email.com",
        email_confirmed_at: "2026-08-01T00:00:00Z",
      }),
    ).toBe(true)
  })

  it("real email + not confirmed → pending", () => {
    expect(accountStatus({ email: "manuel@email.com", email_confirmed_at: null })).toBe("pending")
  })

  it("fitnessclub.local → legacy", () => {
    expect(
      accountStatus({ email: "axeleac@fitnessclub.local", email_confirmed_at: "2026-01-01T00:00:00Z" }),
    ).toBe("legacy")
  })

  it("null email → incomplete", () => {
    expect(accountStatus({ email: null, email_confirmed_at: null })).toBe("incomplete")
  })
})
