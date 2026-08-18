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

export type ExerciseGifData = {
  /** Signed URL con TTL de 1 hora. */
  url: string
  /** Texto de atribución del asset, si existe en la metadata. */
  attribution: string | null
}

/**
 * Devuelve signed URL + attribution para el GIF principal del ejercicio,
 * o null si no hay media activa/autorizada.
 */
export async function getExerciseGifData(
  exerciseId: string
): Promise<ExerciseGifData | null> {
  const service = createServiceRoleClient()

  // Solo media activa con licencia válida
  const { data, error } = await service
    .from("exercise_media")
    .select("storage_path, attribution")
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

  return {
    url:         signed.signedUrl,
    attribution: (data.attribution as string | null) ?? null,
  }
}

/**
 * Devuelve únicamente la signed URL para el GIF principal del ejercicio,
 * o null si no existe media activa/autorizada.
 *
 * Mantiene la firma original para compatibilidad con llamadores existentes.
 */
export async function getExerciseGifSignedUrl(
  exerciseId: string
): Promise<string | null> {
  const gifData = await getExerciseGifData(exerciseId)
  return gifData?.url ?? null
}
