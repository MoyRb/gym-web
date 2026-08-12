import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, backHref, backLabel = "Volver", actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      {backHref && (
        <Link
          href={backHref}
          className="mb-1 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
