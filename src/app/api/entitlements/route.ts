/**
 * GET /api/entitlements
 *
 * Returns the authenticated user's entitlements and billing context.
 * Used by client components to display quota info and gate UI.
 * Actual enforcement happens server-side in the respective API routes.
 */

import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { getUserEntitlements } from "@/lib/entitlements/get-entitlements"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  const [entitlements, stripeSubResult] = await Promise.all([
    getUserEntitlements(user.id),
    // Check for active Stripe subscription (determines portal button visibility)
    createServiceRoleClient()
      .from("billing_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "past_due"])
      .maybeSingle(),
  ])

  return Response.json({
    plan: entitlements.plan,
    canCreateManualPlans: entitlements.canCreateManualPlans,
    canTrackWorkouts: entitlements.canTrackWorkouts,
    aiGenerationAllowed: entitlements.aiGenerationAllowed,
    aiNextAvailableAt: entitlements.aiNextAvailableAt?.toISOString() ?? null,
    showAds: entitlements.showAds,
    advancedAnalytics: entitlements.advancedAnalytics,
    // True when user has an active Stripe subscription (shows portal button in UI)
    hasActiveStripeSubscription: !!stripeSubResult.data,
  })
}
