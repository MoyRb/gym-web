import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

interface SectionHeaderProps {
  label: string
  icon?: LucideIcon
  action?: ReactNode
}

export function SectionHeader({ label, icon: Icon, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className="h-5 w-5 text-primary" />}
        {label}
      </h2>
      {action && <div>{action}</div>}
    </div>
  )
}
