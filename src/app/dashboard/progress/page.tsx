"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Dumbbell,
  Loader2,
  Plus,
  Ruler,
  Scale,
  Target,
  TrendingUp,
  X,
} from "lucide-react"
import { useProfile } from "@/hooks/useProfile"
import { createClient } from "@/lib/supabase/client"
import { getUserSafely } from "@/lib/supabase/auth-helpers"
import { ImcCard } from "@/components/dashboard/ImcCard"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { SectionHeader } from "@/components/dashboard/SectionHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { calcularIMC } from "@/utils/imc"
import { getObjetivoLabel } from "@/utils/routines"
import type { ProgressMeasurementRow } from "@/types/database"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionEntry {
  id: string
  started_at: string
  duration_seconds: number | null
  plan_day_name: string | null
  completed_sets: number
}

interface WeeklyStats {
  sessionsCompleted: number
  totalDurationSeconds: number
  totalSetsCompleted: number
  totalVolumeKg: number
}

// ── Measurement Form ──────────────────────────────────────────────────────────

function MeasurementForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState({
    weight_kg: "",
    body_fat_percent: "",
    waist_cm: "",
    chest_cm: "",
    arm_cm: "",
    thigh_cm: "",
    notes: "",
  })

  const set = (key: keyof typeof fields, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload: Record<string, unknown> = {}
    if (fields.weight_kg)        payload.weight_kg        = parseFloat(fields.weight_kg)
    if (fields.body_fat_percent) payload.body_fat_percent = parseFloat(fields.body_fat_percent)
    if (fields.waist_cm)         payload.waist_cm         = parseFloat(fields.waist_cm)
    if (fields.chest_cm)         payload.chest_cm         = parseFloat(fields.chest_cm)
    if (fields.arm_cm)           payload.arm_cm           = parseFloat(fields.arm_cm)
    if (fields.thigh_cm)         payload.thigh_cm         = parseFloat(fields.thigh_cm)
    if (fields.notes)            payload.notes            = fields.notes

    try {
      const res = await fetch("/api/workout/progress/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? "Error guardando")
        return
      }
      onSaved()
    } catch {
      setError("Error de red")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-background shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-base font-semibold">Registrar medición</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "weight_kg" as const,        label: "Peso (kg)",       placeholder: "70.5" },
              { key: "body_fat_percent" as const,  label: "Grasa corporal (%)", placeholder: "20" },
              { key: "waist_cm" as const,          label: "Cintura (cm)",    placeholder: "80" },
              { key: "chest_cm" as const,          label: "Pecho (cm)",      placeholder: "100" },
              { key: "arm_cm" as const,            label: "Brazo (cm)",      placeholder: "35" },
              { key: "thigh_cm" as const,          label: "Muslo (cm)",      placeholder: "55" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder={placeholder}
                  value={fields[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas</label>
            <textarea
              rows={2}
              placeholder="Opcional…"
              value={fields.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar medición
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { profile, loadProfile, isFetched } = useProfile()

  const [history, setHistory]             = useState<SessionEntry[]>([])
  const [weeklyStats, setWeeklyStats]     = useState<WeeklyStats | null>(null)
  const [measurements, setMeasurements]   = useState<ProgressMeasurementRow[]>([])
  const [dataLoading, setDataLoading]     = useState(true)
  const [showMeasForm, setShowMeasForm]   = useState(false)

  useEffect(() => {
    void loadProfile().catch(() => {})
  }, [loadProfile])

  const loadWorkoutData = useCallback(async () => {
    setDataLoading(true)
    try {
      const supabase = createClient()
      const user = await getUserSafely(supabase, "ProgressPage")
      if (!user) return

      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // 1. Recent history (last 10 completed sessions)
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select(`
          id, started_at, duration_seconds, status,
          workout_plan_days ( name )
        `)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(10)

      // 2. Weekly sessions count
      const { data: weeklySessions } = await supabase
        .from("workout_sessions")
        .select("id, duration_seconds")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("started_at", since7d)

      // 3. Progress measurements
      const { data: meas } = await supabase
        .from("progress_measurements")
        .select("*")
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(20)

      // Aggregate weekly sets
      const weeklyIds = (weeklySessions ?? []).map((s) => s.id)
      let weeklySets = 0
      let weeklyVolume = 0
      let weeklyDuration = 0

      if (weeklyIds.length > 0) {
        const { data: sets } = await supabase
          .from("workout_sets")
          .select(`
            completed, weight_kg, reps,
            workout_session_exercises!inner ( workout_session_id )
          `)
          .eq("completed", true)
          .in("workout_session_exercises.workout_session_id", weeklyIds)

        for (const row of sets ?? []) {
          const r = row as unknown as {
            weight_kg: number | null
            reps: number | null
            workout_session_exercises: { workout_session_id: string }
          }
          weeklySets++
          if (r.weight_kg != null && r.reps != null) {
            weeklyVolume += r.weight_kg * r.reps
          }
        }

        weeklyDuration = (weeklySessions ?? []).reduce(
          (acc, s) => acc + (s.duration_seconds ?? 0),
          0,
        )
      }

      // Get completed sets count per session for history display
      let historyEntries: SessionEntry[] = []
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s) => s.id)
        const { data: sessionSets } = await supabase
          .from("workout_sets")
          .select(`
            completed,
            workout_session_exercises!inner ( workout_session_id )
          `)
          .eq("completed", true)
          .in("workout_session_exercises.workout_session_id", sessionIds)

        const setsPerSession = new Map<string, number>()
        for (const row of sessionSets ?? []) {
          const r = row as unknown as {
            workout_session_exercises: { workout_session_id: string }
          }
          const sid = r.workout_session_exercises.workout_session_id
          setsPerSession.set(sid, (setsPerSession.get(sid) ?? 0) + 1)
        }

        historyEntries = (sessions ?? []).map((s) => {
          const raw = s as unknown as {
            id: string
            started_at: string
            duration_seconds: number | null
            workout_plan_days: { name: string } | null
          }
          return {
            id: raw.id,
            started_at: raw.started_at,
            duration_seconds: raw.duration_seconds,
            plan_day_name: raw.workout_plan_days?.name ?? null,
            completed_sets: setsPerSession.get(raw.id) ?? 0,
          }
        })
      }

      setHistory(historyEntries)
      setWeeklyStats({
        sessionsCompleted: weeklyIds.length,
        totalDurationSeconds: weeklyDuration,
        totalSetsCompleted: weeklySets,
        totalVolumeKg: Math.round(weeklyVolume * 10) / 10,
      })
      setMeasurements((meas ?? []) as ProgressMeasurementRow[])
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWorkoutData()
  }, [loadWorkoutData])

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
  const imcValue =
    typeof imcResult.value === "number" && Number.isFinite(imcResult.value)
      ? String(imcResult.value)
      : "—"

  return (
    <div className="flex flex-col gap-6">
      {showMeasForm && (
        <MeasurementForm
          onClose={() => setShowMeasForm(false)}
          onSaved={() => {
            setShowMeasForm(false)
            void loadWorkoutData()
          }}
        />
      )}

      <PageHeader title="Mi progreso" />

      {/* Body stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Peso actual" value={profile.peso_kg} unit="kg" icon={Scale} />
        <MetricCard label="Altura"      value={profile.altura_cm} unit="cm" icon={Ruler} />
        <MetricCard label="IMC"         value={imcValue} icon={Activity} />
        <MetricCard label="Objetivo"    value={getObjetivoLabel(profile.objetivo)} icon={Target} />
      </div>

      <ImcCard peso_kg={profile.peso_kg} altura_cm={profile.altura_cm} />

      {/* Weekly stats */}
      <div>
        <SectionHeader label="Esta semana (últimos 7 días)" />
        {dataLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                icon: Calendar,
                label: "Sesiones",
                value: weeklyStats?.sessionsCompleted ?? 0,
                unit: "",
              },
              {
                icon: Clock,
                label: "Tiempo total",
                value: formatDuration(weeklyStats?.totalDurationSeconds ?? 0),
                unit: "",
              },
              {
                icon: Dumbbell,
                label: "Series",
                value: weeklyStats?.totalSetsCompleted ?? 0,
                unit: "",
              },
              {
                icon: TrendingUp,
                label: "Volumen",
                value: weeklyStats?.totalVolumeKg ?? 0,
                unit: "kg",
              },
            ].map(({ icon: Icon, label, value, unit }) => (
              <div key={label} className="rounded-xl border bg-muted/20 p-4">
                <Icon className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-xl font-bold">
                  {value}
                  {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
                </p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workout history */}
      <div>
        <SectionHeader label="Entrenamientos recientes" />
        {dataLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Sin entrenamientos aún"
            description="Inicia tu primer entrenamiento desde Mi rutina."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((entry) => (
              <Link
                key={entry.id}
                href={`/dashboard/progress/sessions/${entry.id}`}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {entry.plan_day_name ?? "Entrenamiento libre"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.started_at)} · {formatDuration(entry.duration_seconds)} · {entry.completed_sets} series
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  <BarChart3 className="mr-1 h-3 w-3" />
                  Ver
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Measurements */}
      <div>
        <SectionHeader
          label="Mediciones corporales"
          action={
            <Button size="sm" variant="outline" onClick={() => setShowMeasForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Registrar
            </Button>
          }
        />

        {dataLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : measurements.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="Sin mediciones"
            description="Registra tu peso y otras mediciones para seguir tu progreso."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {measurements.map((m) => (
              <div key={m.id} className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  {new Date(m.measured_at).toLocaleDateString("es-ES", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
                <div className="flex flex-wrap gap-3">
                  {m.weight_kg        != null && <span className="text-sm"><b>{m.weight_kg} kg</b> <span className="text-muted-foreground">peso</span></span>}
                  {m.body_fat_percent != null && <span className="text-sm"><b>{m.body_fat_percent}%</b> <span className="text-muted-foreground">grasa</span></span>}
                  {m.waist_cm        != null && <span className="text-sm"><b>{m.waist_cm} cm</b> <span className="text-muted-foreground">cintura</span></span>}
                  {m.chest_cm        != null && <span className="text-sm"><b>{m.chest_cm} cm</b> <span className="text-muted-foreground">pecho</span></span>}
                  {m.arm_cm          != null && <span className="text-sm"><b>{m.arm_cm} cm</b> <span className="text-muted-foreground">brazo</span></span>}
                  {m.thigh_cm        != null && <span className="text-sm"><b>{m.thigh_cm} cm</b> <span className="text-muted-foreground">muslo</span></span>}
                </div>
                {m.notes && <p className="mt-2 text-xs text-muted-foreground">{m.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
