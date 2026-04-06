import { FileText, Download, BookOpen, Utensils, Heart, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { RecursoPDF } from "@/types"
import { cn } from "@/lib/utils"

const categoryConfig: Record<RecursoPDF["categoria"], { label: string; icon: typeof FileText; className: string }> = {
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
        {recurso.destacado && (
          <Badge className="w-fit text-xs">Destacado</Badge>
        )}
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", config.className)}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <h3 className="font-semibold text-sm leading-snug">{recurso.titulo}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{recurso.descripcion}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={cn("text-xs", config.className, "bg-transparent border border-current/20")}>
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{recurso.paginas} págs</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{recurso.tamaño}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
          onClick={() => onDownload?.(recurso)}
        >
          <Download className="h-3.5 w-3.5" />
          Descargar PDF
        </Button>
      </CardContent>
    </Card>
  )
}
