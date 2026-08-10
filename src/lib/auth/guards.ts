import "server-only"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

export async function requireAuthenticatedUser(): Promise<{ user: User }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { user }
}

export async function requireAdmin(): Promise<{ user: User }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: isAdmin, error } = await supabase.rpc("is_current_user_admin")
  if (error || !isAdmin) redirect("/dashboard")

  return { user }
}
