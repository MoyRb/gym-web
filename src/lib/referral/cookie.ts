import "server-only"
import { cookies } from "next/headers"

/**
 * Referral cookie helpers — server-only.
 *
 * The alpha_ref cookie stores the partner code that originated a visit.
 * It contains ONLY the partner code (e.g. "POWERFIT") — never commission
 * percentages, partner IDs, or any value that could be tampered to affect pricing.
 * Checkout re-validates the code server-side before using it.
 */

const REFERRAL_COOKIE_NAME = "alpha_ref"
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

/** Safe code pattern: uppercase alphanumeric, 2–30 chars */
const SAFE_CODE_RE = /^[A-Z0-9]{2,30}$/

/**
 * Reads and validates the referral cookie.
 * Returns the partner code or null if absent / invalid.
 * Invalid values are silently discarded — the cookie may have been tampered.
 */
export async function getReferralCode(): Promise<string | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(REFERRAL_COOKIE_NAME)?.value ?? null
  if (!raw) return null
  const normalized = raw.toUpperCase()
  if (!SAFE_CODE_RE.test(normalized)) return null
  return normalized
}

/**
 * Sets the referral cookie.
 * HttpOnly + Secure (production) + SameSite=Lax to prevent CSRF.
 */
export async function setReferralCookie(code: string): Promise<void> {
  const normalized = code.toUpperCase()
  const cookieStore = await cookies()
  cookieStore.set(REFERRAL_COOKIE_NAME, normalized, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE,
  })
}

/** Removes the referral cookie. Called after attribution is confirmed. */
export async function clearReferralCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(REFERRAL_COOKIE_NAME)
}
