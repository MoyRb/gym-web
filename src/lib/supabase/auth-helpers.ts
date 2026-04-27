"use client"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const INVALID_REFRESH_TOKEN_MESSAGES = [
  "Invalid Refresh Token",
  "Refresh Token Not Found",
]

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) return ""
  const message = (error as { message?: unknown }).message
  return typeof message === "string" ? message : ""
}

export function isInvalidRefreshTokenError(error: unknown) {
  const message = getErrorMessage(error)
  return INVALID_REFRESH_TOKEN_MESSAGES.some((item) => message.includes(item))
}

export async function clearInvalidSession(
  supabase: SupabaseClient<Database>,
  context: string
) {
  try {
    await supabase.auth.signOut({ scope: "local" })
  } catch (signOutError) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auth] No se pudo limpiar sesión inválida en ${context}`, signOutError)
    }
  }
}

export async function getUserSafely(
  supabase: SupabaseClient<Database>,
  context: string
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error) return user

  if (isInvalidRefreshTokenError(error)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auth] Refresh token inválido detectado en ${context}. Limpiando sesión local.`)
    }
    await clearInvalidSession(supabase, context)
    return null
  }

  throw error
}
