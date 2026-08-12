import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon: LucideIcon
}

export function MetricCard({ label, value, unit, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-5">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">
            {value}
            {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}
