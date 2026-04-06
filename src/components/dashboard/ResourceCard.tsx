import { Download, BookOpen, Utensils, Heart, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RecursoPDF } from "@/types"
import { cn } from "@/lib/utils"

const categoryConfig: Record<RecursoPDF["categoria"], { label: string; icon: typeof Zap; className: string }> = {
  nutricion: { label: "Nutrición", icon: Utensils, className: "bg-green-500/10 text-green-600" },
  entrenamiento: { label: "Entrenamiento", icon: Zap, className: "bg-primary/10 text-primary" },
  recuperacion: { label: "Recuperación", icon: Heart, className: "bg-blue-500/10 text-blue-600" },
  motivacion: { label: "Motivación", icon: BookOpen, className: "bg-purple-500/10 text-purple-600" },
}

interface ResourceCardProps {
  recurso: RecursoPDF
  onDownload?: (recurso: RecursoPDF) => void
}

export function ResourceCard({ recurso, onDownload }: ResourceCardProps) {
  const config = categoryConfig[recurso.categoria]
  const Icon = config.icon

  return (
    <Card className={cn("group transition-shadow hover:shadow-md", recurso.destacado && "ring-2 ring-primary/20")}>
      <CardContent className="flex flex-col gap-4 pt-5">
        {recurso.destacado && <Badge className="w-fit text-xs">Destacado</Badge>}
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", config.className)}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-sm font-semibold leading-snug">{recurso.titulo}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{recurso.descripcion}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={cn("border border-current/20 bg-transparent text-xs", config.className)}>
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{recurso.paginas} págs</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{recurso.tamaño}</span>
        </div>

        <a
          href={recurso.url}
          download
          onClick={() => onDownload?.(recurso)}
          className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar PDF
        </a>
      </CardContent>
    </Card>
  )
}
