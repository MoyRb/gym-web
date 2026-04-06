"use client"

import { useEffect } from "react"
import Link from "next/link"
import { ArrowRight, FileText, User, Dumbbell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WelcomeCard } from "@/components/dashboard/WelcomeCard"
import { ImcCard } from "@/components/dashboard/ImcCard"
import { RoutineCard } from "@/components/dashboard/RoutineCard"
import { ResourceCard } from "@/components/dashboard/ResourceCard"
import { useProfile } from "@/hooks/useProfile"
import { recomendarRutina } from "@/utils/routines"
import { analytics } from "@/utils/analytics"
import { mockRecursos } from "@/data/mock-data"
import type { RecursoPDF } from "@/types"

export default function DashboardPage() {
  const { profile } = useProfile()

  const rutina = profile ? recomendarRutina(profile.objetivo, profile.experiencia, profile.dias_por_semana) : null

  useEffect(() => {
    if (rutina) analytics.routineViewed(rutina.id, rutina.titulo)
  }, [rutina])

  if (!profile || !rutina) {
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

  const featuredResources = mockRecursos.filter((r) => r.destacado).slice(0, 2)


  function handleDownload(recurso: RecursoPDF) {
    analytics.pdfDownloaded(recurso.id, recurso.titulo)
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
          <Link href="/dashboard/recursos" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Ver material
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <RoutineCard rutina={rutina} />
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
