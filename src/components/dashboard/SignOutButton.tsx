"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut({ scope: "local" })
    if (error && process.env.NODE_ENV !== "production") {
      console.warn("[SignOutButton] No se pudo cerrar sesión local", error.message)
    }
    router.push("/login")
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      Cerrar sesión
    </button>
  )
}
