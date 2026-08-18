import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: isAdminResult } = await supabase.rpc("is_current_user_admin")
  const isAdmin = isAdminResult === true

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar isAdmin={isAdmin} />
      <main className="relative flex-1 overflow-y-auto pb-[calc(var(--nav-bottom-height)+env(safe-area-inset-bottom,0px))] md:pb-0">
        <BrandBackground variant="app" />
        <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
