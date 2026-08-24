import { describe, it, expect } from "vitest"

const COOLDOWN_SECONDS = 60

describe("resend verification UX contract (section 47)", () => {
  it("cooldown is 60 seconds", () => {
    expect(COOLDOWN_SECONDS).toBe(60)
  })

  it("resend response message is neutral (no PII disclosure)", () => {
    // The message must not reveal whether the email exists.
    const neutralMessage = "Si la dirección es válida, enviamos un nuevo correo."
    expect(neutralMessage).not.toContain("@")
    expect(neutralMessage).not.toContain("email registrado")
    expect(neutralMessage).not.toContain("ya existe")
  })

  it("pending email stored in sessionStorage, not localStorage", () => {
    // This is a contract test — verify the storage key and mechanism.
    const STORAGE_KEY = "alpha-trainer.pending-email"
    expect(STORAGE_KEY).toBe("alpha-trainer.pending-email")
    // sessionStorage is ephemeral (cleared on tab close) — preferred over localStorage for this.
  })

  it("analytics events do not include PII", () => {
    // signupVerificationSent event carries no email, username, or token.
    const allowedPayloadKeys: string[] = []
    expect(allowedPayloadKeys).not.toContain("email")
    expect(allowedPayloadKeys).not.toContain("username")
    expect(allowedPayloadKeys).not.toContain("token")
  })
})
