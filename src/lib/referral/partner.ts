import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"

export interface GymPartner {
  id: string
  name: string
  code: string
  status: "active" | "inactive"
  monthly_commission_bps: number
  long_term_commission_bps: number
  created_at: string
  updated_at: string
}

/**
 * Looks up an active gym partner by their public referral code.
 * Returns null for inactive or non-existent codes.
 * Used server-side only — never exposes partner data to the browser.
 */
export async function getActivePartnerByCode(code: string): Promise<GymPartner | null> {
  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("gym_partners")
    .select("id, name, code, status, monthly_commission_bps, long_term_commission_bps, created_at, updated_at")
    .eq("code", code.toUpperCase())
    .eq("status", "active")
    .maybeSingle()

  if (error) {
    console.error("[getActivePartnerByCode] DB error:", error.code)
    return null
  }

  return data as GymPartner | null
}

/**
 * Looks up a gym partner by ID (active or inactive).
 * Used in webhook commission processing where partner may be inactive after attribution.
 */
export async function getPartnerById(id: string): Promise<GymPartner | null> {
  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("gym_partners")
    .select("id, name, code, status, monthly_commission_bps, long_term_commission_bps, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[getPartnerById] DB error:", error.code)
    return null
  }

  return data as GymPartner | null
}
