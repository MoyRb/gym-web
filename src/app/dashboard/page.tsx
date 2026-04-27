"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, FileText, User, Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WelcomeCard } from "@/components/dashboard/WelcomeCard"
import { ImcCard } from "@/components/dashboard/ImcCard"
import { RoutineCard } from "@/components/dashboard/RoutineCard"
import { ResourceCard } from "@/components/dashboard/ResourceCard"
import { useProfile } from "@/hooks/useProfile"
import { analytics } from "@/utils/analytics"
import { createClient } from "@/lib/supabase/client"
import { getUserSafely } from "@/lib/supabase/auth-helpers"
import { mapResource } from "@/lib/fitness-data"
import { normalizeRoutineData } from "@/lib/routine-catalog"
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

  if (!isFetched) {
    return <div className="py-24 text-center text-muted-foreground">Cargando dashboard...</div>
  }

  if (!profile || !routine) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-10 w-10 text-primary/50" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Completa tu perfil físico</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">
            Para recibir tu rutina recomendada necesitamos tus datos básicos.
          </p>
        </div>
        <Link href="/dashboard/perfil">
          <Button className="gap-2">
            Completar mi perfil
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <WelcomeCard profile={profile} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ImcCard peso_kg={profile.peso_kg} altura_cm={profile.altura_cm} />
        </div>

        <div className="grid grid-cols-2 content-start gap-4 lg:col-span-2">
          {[
            { label: "Tu objetivo", value: profile.objetivo.replace(/_/g, " "), icon: "🎯" },
            { label: "Nivel", value: profile.experiencia, icon: "💪" },
            { label: "Días de entreno", value: `${profile.dias_por_semana} días/sem`, icon: "📅" },
            { label: "Edad", value: `${profile.edad} años`, icon: "👤" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/5"
            >
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="mt-0.5 font-semibold capitalize">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Dumbbell className="h-5 w-5 text-primary" />
            Tu rutina recomendada
          </h2>
          <Link href="/dashboard/rutina" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Ver detalle completo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <RoutineCard rutina={routine} />
      </div>

      {featuredResources.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              Material descargable
            </h2>
            <Link href="/dashboard/recursos" className="flex items-center gap-1 text-sm text-primary hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featuredResources.map((r) => (
              <ResourceCard key={r.id} recurso={r} onDownload={handleDownload} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
