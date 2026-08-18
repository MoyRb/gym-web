import type { ReactNode } from "react"

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  positive?: boolean
  children?: ReactNode
}

/**
 * Compact metric card for admin analytics.
 * Denser than MetricCard — optimized for data-rich dashboards.
 */
export function KpiCard({ label, value, sub, accent, positive, children }: KpiCardProps) {
  return (
    <div
      className={[
        "flex flex-col gap-0.5 rounded border p-3",
        accent
          ? "border-primary/25 bg-primary/5"
          : positive === true
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-border bg-card",
      ].join(" ")}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          "text-2xl font-bold tabular-nums leading-none",
          accent ? "text-primary" : positive === true ? "text-emerald-400" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      )}
      {children}
    </div>
  )
}
