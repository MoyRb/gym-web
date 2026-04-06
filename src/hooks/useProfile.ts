"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toProfileInsert, toRoutineInsert, toUserProfile } from "@/lib/fitness-data"
import type { UserProfile } from "@/types"

function getUsernameFromMetadata(user: { user_metadata?: unknown }) {
  const candidate = user.user_metadata && typeof user.user_metadata === "object"
    ? (user.user_metadata as { username?: unknown }).username
    : undefined

  if (typeof candidate !== "string") return null
  const normalized = candidate.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetched, setIsFetched] = useState(false)

  const loadProfile = useCallback(async (): Promise<UserProfile | null> => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) {
        setProfile(null)
        return null
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (error) throw error
      const mapped = data ? toUserProfile(data) : null
      setProfile(mapped)
      return mapped
    } finally {
      setIsFetched(true)
      setIsLoading(false)
    }
  }, [])

  const saveProfile = useCallback(async (data: UserProfile) => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) throw userError
      if (!user) throw new Error("No hay sesión activa")

      const metadataUsername = getUsernameFromMetadata(user)
      let username = metadataUsername

      if (!username) {
        const { data: existingProfile, error: profileLookupError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()

        if (profileLookupError) {
          throw new Error(`No se pudo recuperar el username del perfil: ${profileLookupError.message}`)
        }

        const existingUsername = typeof existingProfile?.username === "string"
          ? existingProfile.username.trim().toLowerCase()
          : ""

        if (existingUsername) {
          username = existingUsername
        }
      }

      if (!username) {
        throw new Error("No se encontró username en la sesión ni en el perfil. Vuelve a iniciar sesión.")
      }

      const profilePayload = toProfileInsert(user.id, username, data)
      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload)
      if (profileError) throw profileError

      const routinePayload = toRoutineInsert(user.id, data)
      const { error: routineError } = await supabase
        .from("routine_recommendations")
        .upsert(routinePayload, { onConflict: "user_id" })
      if (routineError) throw routineError

      setProfile(data)
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[useProfile.saveProfile] Error guardando perfil", error)
      }
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { profile, saveProfile, loadProfile, isLoading, isFetched }
}
