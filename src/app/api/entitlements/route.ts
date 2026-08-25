/**
 * GET /api/entitlements
 *
 * Returns the authenticated user's entitlements.
 * Used by client components to display quota info and gate UI.
 * Actual enforcement happens server-side in the respective API routes.
 */

import { createClient } from "@/lib/supabase/server"
import { getUserEntitlements } from "@/lib/entitlements/get-entitlements"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const entitlements = await getUserEntitlements(user.id)

  return Response.json({
    plan: entitlements.plan,
    canCreateManualPlans: entitlements.canCreateManualPlans,
    canTrackWorkouts: entitlements.canTrackWorkouts,
    aiGenerationAllowed: entitlements.aiGenerationAllowed,
    aiNextAvailableAt: entitlements.aiNextAvailableAt?.toISOString() ?? null,
    showAds: entitlements.showAds,
    advancedAnalytics: entitlements.advancedAnalytics,
  })
}
