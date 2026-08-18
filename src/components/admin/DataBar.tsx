import { barWidth } from "@/lib/admin/utils"

interface DataBarProps {
  label: string
  value: number
  max: number
  /** Display text to the right of the bar (e.g. "124" or "22%") */
  displayValue?: string | number
  /** Secondary display (e.g. count alongside percentage) */
  sub?: string | number
  color?: "primary" | "emerald" | "muted"
}

/**
 * Horizontal bar row used in admin analytics lists.
 * Dense layout: label — bar — value.
 */
export function DataBar({
  label,
  value,
  max,
  displayValue,
  sub,
  color = "primary",
}: DataBarProps) {
  const width = barWidth(value, max)

  const barColor =
    color === "emerald"
      ? "bg-emerald-500"
      : color === "muted"
      ? "bg-muted-foreground/40"
      : "bg-primary"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium truncate text-foreground/90">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {sub !== undefined && (
            <span className="text-muted-foreground tabular-nums">{sub}</span>
          )}
          <span className="font-semibold tabular-nums">
            {displayValue ?? value}
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
