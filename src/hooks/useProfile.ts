"use client"

import { useState, useCallback } from "react"
import type { UserProfile } from "@/types"

// TODO: Replace localStorage with Supabase calls
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem("gym_profile")
      return stored ? (JSON.parse(stored) as UserProfile) : null
    } catch {
      return null
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  const saveProfile = useCallback(async (data: UserProfile) => {
    setIsLoading(true)
    try {
      // TODO: await supabase.from('profiles').upsert(data)
      localStorage.setItem("gym_profile", JSON.stringify(data))
      setProfile(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearProfile = useCallback(() => {
    localStorage.removeItem("gym_profile")
    setProfile(null)
  }, [])

  return { profile, saveProfile, clearProfile, isLoading }
}
