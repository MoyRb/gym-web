import { Flame } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UserProfile } from "@/types"
import { getObjetivoLabel } from "@/utils/routines"

interface WelcomeCardProps {
  profile: UserProfile
}

export function WelcomeCard({ profile }: WelcomeCardProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-primary/5" />
      <CardContent className="relative pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">¡Hoy es tu día!</span>
            </div>
            <h2 className="text-2xl font-bold">
              {greeting}, {profile.nombre.split(" ")[0]} 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              Sigue con tu plan. Estás a un entrenamiento de distancia de tu mejor versión.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-xs">
              {getObjetivoLabel(profile.objetivo)}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {profile.experiencia}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-background/60 p-4 ring-1 ring-border/50">
          <div className="flex flex-col gap-0.5 text-center">
            <span className="text-2xl font-bold text-primary">{profile.dias_por_semana}</span>
            <span className="text-xs text-muted-foreground">Días/semana</span>
          </div>
          <div className="flex flex-col gap-0.5 text-center border-x border-border/50">
            <span className="text-2xl font-bold text-primary">{profile.peso_kg}</span>
            <span className="text-xs text-muted-foreground">Kg actuales</span>
          </div>
          <div className="flex flex-col gap-0.5 text-center">
            <span className="text-2xl font-bold text-primary">{profile.altura_cm}</span>
            <span className="text-xs text-muted-foreground">Cm altura</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
