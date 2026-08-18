interface SparkBarsProps {
  data: { label: string; value: number }[]
  height?: number
  color?: string
  showLabels?: boolean
}

/**
 * Lightweight SVG bar chart — no external dependencies.
 * Suitable for small trend visualizations in admin dashboards.
 */
export function SparkBars({
  data,
  height = 48,
  color = "#CF2020",
  showLabels = false,
}: SparkBarsProps) {
  if (!data.length) return null

  const max = Math.max(...data.map((d) => d.value), 1)
  const barW = 100 / data.length
  const gap  = 0.5 // percentage gap between bars

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        aria-hidden
      >
        {data.map((d, i) => {
          const barHeight = Math.max((d.value / max) * height * 0.9, d.value > 0 ? 1 : 0)
          const x = i * barW + gap
          const w = barW - gap * 2
          const y = height - barHeight
          return (
            <rect
              key={i}
              x={`${x}%`}
              y={y}
              width={`${w}%`}
              height={barHeight}
              fill={color}
              opacity={d.value === 0 ? 0.15 : 0.85}
              rx="1"
            />
          )
        })}
      </svg>
      {showLabels && (
        <div
          className="flex text-[10px] text-muted-foreground mt-1"
          style={{ gap: `${gap * 2}%` }}
        >
          {data.map((d, i) => (
            <span key={i} className="flex-1 text-center truncate">{d.label}</span>
          ))}
        </div>
      )}
    </div>
  )
}
