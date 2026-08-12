"use client"

import { useEffect } from "react"
import { Scale, Ruler, Activity, Target } from "lucide-react"
import { useProfile } from "@/hooks/useProfile"
import { ImcCard } from "@/components/dashboard/ImcCard"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { SectionHeader } from "@/components/dashboard/SectionHeader"
import { calcularIMC } from "@/utils/imc"
import { getObjetivoLabel } from "@/utils/routines"

export default function ProgressPage() {
  const { profile, loadProfile, isFetched } = useProfile()

  useEffect(() => {
    void loadProfile().catch(() => {})
  }, [loadProfile])

  if (!isFetched) {
    return <div className="py-24 text-center text-muted-foreground">Cargando...</div>
  }

  if (!profile) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mi progreso" />
        <EmptyState
          icon={Activity}
          title="Completa tu perfil"
          description="Completa tu perfil para ver tu progreso y métricas de salud."
        />
      </div>
    )
  }

  const imcResult = calcularIMC(profile.peso_kg, profile.altura_cm)
  const imcValue = typeof imcResult.value === "number" && Number.isFinite(imcResult.value)
    ? String(imcResult.value)
    : "—"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi progreso" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Peso actual" value={profile.peso_kg} unit="kg" icon={Scale} />
        <MetricCard label="Altura" value={profile.altura_cm} unit="cm" icon={Ruler} />
        <MetricCard label="IMC" value={imcValue} icon={Activity} />
        <MetricCard label="Objetivo" value={getObjetivoLabel(profile.objetivo)} icon={Target} />
      </div>

      <ImcCard peso_kg={profile.peso_kg} altura_cm={profile.altura_cm} />

      <div>
        <SectionHeader label="Historial" />
        <EmptyState
          icon={Activity}
          title="Seguimiento histórico próximamente"
          description="Próximamente podrás registrar tu progreso semana a semana y ver la evolución de tus métricas."
        />
      </div>
    </div>
  )
}
