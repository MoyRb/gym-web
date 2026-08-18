/**
 * GET /api/exercises/[exerciseId]/gif
 *
 * Devuelve la signed URL del GIF principal de un ejercicio.
 *
 * - Requiere sesión autenticada (anon recibe 401).
 * - La signed URL se genera server-side con service_role; nunca se expone
 *   el service_role_key al cliente.
 * - Solo se emite URL para media is_active=true y license_status IN ('licensed','owned').
 * - Media 'pending' siempre devuelve { url: null }.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getExerciseGifSignedUrl } from "@/lib/supabase/media"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const { exerciseId } = await params

  // Validar formato UUID antes de consultar
  if (!UUID_REGEX.test(exerciseId)) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  // Auth check — usuario autenticado requerido
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ url: null }, { status: 401 })
  }

  const url = await getExerciseGifSignedUrl(exerciseId)
  return NextResponse.json({ url })
}
