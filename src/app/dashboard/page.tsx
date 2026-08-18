"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, User, Dumbbell, TrendingUp, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WelcomeCard } from "@/components/dashboard/WelcomeCard"
import { TodayWorkoutCard } from "@/components/dashboard/TodayWorkoutCard"
import { RoutineCard } from "@/components/dashboard/RoutineCard"
import { ResourceCard } from "@/components/dashboard/ResourceCard"
import { QuickActionCard } from "@/components/dashboard/QuickActionCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/hooks/useProfile"
import { analytics } from "@/utils/analytics"
import { createClient } from "@/lib/supabase/client"
import { getUserSafely } from "@/lib/supabase/auth-helpers"
import { mapResource } from "@/lib/fitness-data"
import { normalizeRoutineData } from "@/lib/routine-catalog"
import { getObjetivoLabel, getExperienciaLabel } from "@/utils/routines"
import type { RecursoPDF, Rutina } from "@/types"

export default function DashboardPage() {
  const { profile, loadProfile, isFetched } = useProfile()
  const [resources, setResources] = useState<RecursoPDF[]>([])
  const [routine, setRoutine] = useState<Rutina | null>(null)

  useEffect(() => {
    const supabase = createClient()

    void loadProfile().catch((error) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[dashboard] Error cargando perfil", error)
      }
    })

    void (async () => {
      const user = await getUserSafely(supabase, "dashboard.loadUserData")

      if (!user) return

      const [resourceResult, routineResult] = await Promise.all([
        supabase
          .from("resources")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("routine_recommendations")
          .select("routine_data")
          .eq("user_id", user.id)
          .maybeSingle(),
      ])

      if (resourceResult.data) {
        setResources(resourceResult.data.map(mapResource))
      }

      const routineRow = routineResult.data as { routine_data?: unknown } | null
      if (routineRow?.routine_data) {
        setRoutine(normalizeRoutineData(routineRow.routine_data))
      }
    })()
  }, [loadProfile])

  useEffect(() => {
    if (routine) void analytics.routineViewed(routine.id, routine.title)
  }, [routine])

  const featuredResources = useMemo(() => resources.slice(0, 2), [resources])

  async function handleDownload(recurso: RecursoPDF) {
    const supabase = createClient()
    const user = await getUserSafely(supabase, "dashboard.handleDownload")

    if (user) {
      await supabase.from("user_resource_downloads").insert({ user_id: user.id, resource_id: recurso.id })
    }

    await analytics.pdfDownloaded(recurso.id, recurso.titulo, recurso.categoria)

    const link = document.createElement("a")
    link.href = recurso.url
    link.download = ""
    link.rel = "noopener"
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  /* ── Loading state ── */
  if (!isFetched) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
    )
  }

  /* ── Setup state — no profile or no routine ── */
  if (!profile || !routine) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
          <User className="h-8 w-8 text-primary/60" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Completa tu perfil para comenzar</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Ingresa tu objetivo, nivel de experiencia y días disponibles para que la IA genere tu plan.
          </p>
        </div>
        <Link href="/dashboard/perfil">
          <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            Completar mi perfil
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  /* ── Dashboard ── */
  return (
    <div className="flex flex-col gap-6">
      {/* Welcome header */}
      <WelcomeCard profile={profile} />

      {/* Today's workout — primary focus */}
      <TodayWorkoutCard rutina={routine} />

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickActionCard
          href="/dashboard/rutina"
          icon={Dumbbell}
          label="Objetivo"
          value={getObjetivoLabel(profile.objetivo)}
        />
        <QuickActionCard
          href="/dashboard/progress"
          icon={TrendingUp}
          label="Nivel"
          value={getExperienciaLabel(profile.experiencia)}
        />
        <QuickActionCard
          href="/dashboard/exercises"
          icon={ListChecks}
          label="Ejercicios"
          value="Explorar"
        />
        <QuickActionCard
          href="/dashboard/progress"
          icon={TrendingUp}
          label="Días de entreno"
          value={`${profile.dias_por_semana} días/sem`}
        />
      </div>

      {/* Routine detail (collapsible view) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Detalle de rutina
          </h2>
          <Link
            href="/dashboard/rutina"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Gestionar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <RoutineCard rutina={routine} />
      </div>

      {/* Resources — secondary */}
      {featuredResources.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Biblioteca
            </h2>
            <Link
              href="/dashboard/recursos"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todo
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {featuredResources.map((r) => (
              <ResourceCard key={r.id} recurso={r} onDownload={handleDownload} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
