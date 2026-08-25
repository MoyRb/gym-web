import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { PLAN_CONFIG } from "./config"

export type PlanName = "free" | "pro" | "founder"

export interface UserEntitlements {
  plan: PlanName
  canCreateManualPlans: boolean
  canTrackWorkouts: boolean
  aiGenerationAllowed: boolean
  aiNextAvailableAt: Date | null
  showAds: boolean
  advancedAnalytics: boolean
}

/**
 * Resolves all entitlements for a user.
 * No row in user_access => free plan (default, fail-closed).
 * Called server-side only; never trust client-provided plan claims.
 */
export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const client = createServiceRoleClient()

  // 1. Resolve plan — no row = free
  const { data: accessRow } = await client
    .from("user_access")
    .select("plan, valid_until")
    .eq("user_id", userId)
    .maybeSingle()

  const rawPlan = accessRow?.plan as PlanName | null
  const validUntil = accessRow?.valid_until ? new Date(accessRow.valid_until) : null

  // If plan has expired, treat as free
  const plan: PlanName =
    rawPlan && rawPlan !== "free" && validUntil && validUntil < new Date()
      ? "free"
      : (rawPlan ?? "free")

  // 2. Determine AI quota bounds for this plan
  const windowDays =
    plan === "free" ? PLAN_CONFIG.FREE_AI_WINDOW_DAYS : PLAN_CONFIG.PRO_AI_WINDOW_DAYS
  const maxGenerations =
    plan === "free" ? PLAN_CONFIG.FREE_AI_GENERATIONS : PLAN_CONFIG.PRO_AI_GENERATIONS

  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  // 3. Count completed AI generations within the rolling window
  const { count: genCount } = await client
    .from("ai_generation_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")
    .gte("updated_at", windowStart.toISOString())

  const usedInWindow = genCount ?? 0
  const aiGenerationAllowed = usedInWindow < maxGenerations

  // 4. Compute next available timestamp (rolling window from earliest in-window gen)
  let aiNextAvailableAt: Date | null = null
  if (!aiGenerationAllowed) {
    // Find the oldest completed generation in the window — when it "ages out", quota resets
    const { data: oldest } = await client
      .from("ai_generation_sessions")
      .select("updated_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("updated_at", windowStart.toISOString())
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (oldest?.updated_at) {
      aiNextAvailableAt = new Date(
        new Date(oldest.updated_at).getTime() + windowDays * 24 * 60 * 60 * 1000,
      )
    }
  }

  return {
    plan,
    canCreateManualPlans: true,   // all plans, unlimited
    canTrackWorkouts: true,        // all plans, unlimited
    aiGenerationAllowed,
    aiNextAvailableAt,
    showAds: plan === "free",
    advancedAnalytics: plan !== "free",
  }
}
