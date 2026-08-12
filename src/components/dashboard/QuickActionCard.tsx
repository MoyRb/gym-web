import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickActionCardProps {
  href: string
  icon: LucideIcon
  label: string
  value?: string
  description?: string
}

export function QuickActionCard({ href, icon: Icon, label, value, description }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-1 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5 transition-all",
        "hover:ring-primary/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      {value && <p className="font-semibold capitalize">{value}</p>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </Link>
  )
}
