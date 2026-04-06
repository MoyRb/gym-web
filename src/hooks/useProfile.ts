"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toProfileInsert, toRoutineInsert, toUserProfile } from "@/lib/fitness-data"
import type { UserProfile } from "@/types"

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

      const profilePayload = toProfileInsert(user.id, data)
      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload)
      if (profileError) throw profileError

      const routinePayload = toRoutineInsert(user.id, data)
      const { error: routineError } = await supabase
        .from("routine_recommendations")
        .upsert(routinePayload, { onConflict: "user_id" })
      if (routineError) throw routineError

      setProfile(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { profile, saveProfile, loadProfile, isLoading, isFetched }
}
