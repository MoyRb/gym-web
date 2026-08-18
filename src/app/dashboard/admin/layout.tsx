import { requireAdmin } from "@/lib/auth/guards"
import { AdminNav } from "@/components/admin/AdminNav"
import { Badge } from "@/components/ui/badge"

export const metadata = {
  title: "Admin — Alpha Trainer",
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Defense in depth: all admin sub-routes require admin role.
  // Each page also calls requireAdmin() before service-role queries.
  await requireAdmin()

  return (
    <div className="flex flex-col gap-5">
      {/* Admin shell header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Alpha Trainer Internal
            </h1>
            <p className="text-xs text-muted-foreground">
              Analytics Dashboard · datos reales en vivo
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-primary/30 text-primary"
          >
            ADMIN
          </Badge>
        </div>
        <AdminNav />
      </div>

      {/* Page content */}
      <div>{children}</div>
    </div>
  )
}
