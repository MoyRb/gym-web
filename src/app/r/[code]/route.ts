import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { setReferralCookie } from "@/lib/referral/cookie"
import { trackServerEvent } from "@/lib/analytics/server"
import { EVENTS } from "@/lib/analytics/events"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ code: string }>
}

/**
 * GET /r/[code]
 *
 * Public referral redirect route. Used on gym QR codes.
 *
 * Flow:
 *   QR scan → /r/POWERFIT
 *   → validate partner is active
 *   → set HttpOnly referral cookie (alpha_ref=POWERFIT, 30 days)
 *   → redirect to /pricing
 *
 * Security:
 *  - Invalid or inactive codes: redirect to /pricing with no cookie set.
 *  - No partner details are exposed to the client in any response.
 *  - Cookie stores only the code string, not IDs or commission percentages.
 *  - Checkout re-validates the code server-side before using it.
 *
 * The redirect to /pricing is unconditional — no error is shown to the user
 * for invalid codes to avoid leaking information about partner existence.
 */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { code } = await context.params

  // Normalize code: uppercase, strip unsafe characters
  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "")

  // Validate: must be non-empty after normalization (safe code format)
  if (normalizedCode.length < 2 || normalizedCode.length > 30) {
    return NextResponse.redirect(new URL("/pricing", request.url))
  }

  // Look up partner via service_role — never exposes partner table to browser
  const service = createServiceRoleClient()
  const { data: partner } = await service
    .from("gym_partners")
    .select("id, status")
    .eq("code", normalizedCode)
    .maybeSingle()

  const isActive = partner?.status === "active"

  if (isActive) {
    try {
      await setReferralCookie(normalizedCode)

      void trackServerEvent({
        name: EVENTS.REFERRAL_LANDED,
        userId: null,
        // Only track code, never partner UUID or commission details
        metadata: { partner_code: normalizedCode },
      })
    } catch (err) {
      // Cookie failure must not prevent redirect
      console.error("[/r/[code]] Failed to set referral cookie:", err)
    }
  }
  // Inactive or unknown codes: redirect without setting cookie, no error shown

  return NextResponse.redirect(new URL("/pricing", request.url))
}
