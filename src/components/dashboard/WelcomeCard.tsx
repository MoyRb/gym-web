import type { UserProfile } from "@/types"
import { getObjetivoLabel } from "@/utils/routines"

interface WelcomeCardProps {
  profile: UserProfile
}

export function WelcomeCard({ profile }: WelcomeCardProps) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">
          {greeting}
        </p>
        <h1 className="mt-1 text-2xl font-bold">
          {profile.nombre.split(" ")[0]}
        </h1>
      </div>
      <div className="flex flex-wrap gap-2 sm:text-right">
        <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {getObjetivoLabel(profile.objetivo)}
        </span>
        <span className="rounded border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize">
          {profile.experiencia}
        </span>
        <span className="rounded border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {profile.dias_por_semana} días/sem
        </span>
      </div>
    </div>
  )
}
