/**
 * media.ts — Helper server-only para signed URLs de exercise_media.
 *
 * El bucket exercise-media es PRIVADO.
 * Las signed URLs tienen TTL corto y se generan server-side con service_role.
 * El SERVICE_ROLE_KEY nunca llega al cliente.
 *
 * Solo se genera URL cuando:
 *   - is_active = true
 *   - license_status IN ('licensed', 'owned')
 *
 * Los GIF con license_status = 'pending' NUNCA se exponen.
 */
import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/server"

const BUCKET           = "exercise-media"
const SIGNED_URL_TTL_S = 3600 // 1 hora

/**
 * Devuelve una signed URL para el GIF principal del ejercicio,
 * o null si no hay media activa/autorizada.
 */
export async function getExerciseGifSignedUrl(
  exerciseId: string
): Promise<string | null> {
  const service = createServiceRoleClient()

  // Solo media activa con licencia válida
  const { data, error } = await service
    .from("exercise_media")
    .select("storage_path")
    .eq("exercise_id", exerciseId)
    .eq("kind", "gif")
    .eq("is_active", true)
    .in("license_status", ["licensed", "owned"])
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle()

  if (error || !data?.storage_path) return null

  const { data: signed, error: signErr } = await service.storage
    .from(BUCKET)
    .createSignedUrl(data.storage_path, SIGNED_URL_TTL_S)

  if (signErr || !signed?.signedUrl) return null
  return signed.signedUrl
}
