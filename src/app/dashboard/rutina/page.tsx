"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Loader2,
  RefreshCw,
  Target,
  Zap,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getUserSafely } from "@/lib/supabase/auth-helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { getExperienciaLabel, getObjetivoLabel } from "@/utils/routines"
import type { WorkoutPlanWithDays } from "@/types/database"

// ── Helpers de formato ────────────────────────────────────────────────────────

function formatReps(
  repsMin: number | null,
  repsMax: number | null,
  durationSeconds: number | null,
): string {
  if (durationSeconds) return `${durationSeconds} s`
  if (repsMin !== null && repsMax !== null) {
    return repsMin === repsMax ? `${repsMin} reps` : `${repsMin}–${repsMax} reps`
  }
  if (repsMin !== null) return `${repsMin} reps`
  return "—"
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  if (seconds % 60 === 0) return `${seconds / 60} min`
  return `${Math.floor(seconds / 60)} min ${seconds % 60} s`
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function WorkoutExerciseRow({
  exercise,
  index,
}: {
  exercise: WorkoutPlanWithDays["days"][number]["exercises"][number]
  index: number
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {index + 1}
        </span>
        <div className="flex flex-1 flex-col gap-1.5">
          <Link
            href={`/dashboard/exercises/${exercise.exercise_id}`}
            className="font-medium leading-snug hover:text-primary hover:underline"
          >
            {exercise.exercise.name}
          </Link>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">{exercise.sets} series</Badge>
            <Badge variant="outline" className="text-xs">
              {formatReps(exercise.reps_min, exercise.reps_max, exercise.duration_seconds)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Descanso {formatRest(exercise.rest_seconds)}
            </Badge>
          </div>
          {exercise.notes && (
            <p className="text-xs text-muted-foreground">{exercise.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function WorkoutDaySection({
  day,
  index,
  defaultOpen,
}: {
  day: WorkoutPlanWithDays["days"][number]
  index: number
  defaultOpen: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-0">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{day.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {day.description ? `${day.description} · ` : ""}{day.exercises.length} ejercicios
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="mt-4 space-y-2">
          {day.exercises.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No se pudieron resolver ejercicios para esta sesión.
            </p>
          ) : (
            day.exercises.map((exercise, i) => (
              <WorkoutExerciseRow key={exercise.id} exercise={exercise} index={i} />
            ))
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type PageState = "loading" | "no_plan" | "active" | "error"

export default function RutinaPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>("loading")
  const [plan, setPlan] = useState<WorkoutPlanWithDays | null>(null)
  const [generating, setGenerating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadPlan = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)
    try {
      const supabase = createClient()
      const user = await getUserSafely(supabase, "RutinaPage.loadPlan")
      if (!user) {
        setState("error")
        setErrorMsg("Sin sesión activa")
        return
      }

      // Cargar plan activo con días y ejercicios + metadata de exercise
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          id, user_id, name, goal, experience, days_per_week,
          source, status, version, is_active, created_at, updated_at,
          workout_plan_days (
            id, workout_plan_id, day_number, name, description,
            sort_order, created_at, updated_at,
            workout_plan_exercises (
              id, workout_plan_day_id, exercise_id, sort_order,
              sets, reps_min, reps_max, duration_seconds,
              rest_seconds, rir, notes, created_at, updated_at,
              exercises (
                id, name, body_part, equipment, target, muscle_group
              )
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle()

      if (error) {
        setState("error")
        setErrorMsg(error.message)
        return
      }

      if (!data) {
        setState("no_plan")
        return
      }

      // Ordenar días y ejercicios por sort_order en cliente
      const sorted: WorkoutPlanWithDays = {
        ...(data as unknown as WorkoutPlanWithDays),
        days: (
          (data as unknown as { workout_plan_days: WorkoutPlanWithDays["days"] })
            .workout_plan_days ?? []
        )
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((day) => ({
            ...day,
            exercises: (
              (
                day as unknown as {
                  workout_plan_exercises: WorkoutPlanWithDays["days"][number]["exercises"]
                }
              ).workout_plan_exercises ?? []
            )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((ex) => ({
                ...ex,
                exercise: (
                  ex as unknown as {
                    exercises: WorkoutPlanWithDays["days"][number]["exercises"][number]["exercise"]
                  }
                ).exercises,
              })),
          })),
      }

      setPlan(sorted)
      setState("active")
    } catch {
      setState("error")
      setErrorMsg("Error cargando la rutina")
    }
  }, [])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  const handleGenerate = async () => {
    setGenerating(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/workout/generate", { method: "POST" })
      const json = (await res.json()) as { error?: string; planId?: string }
      if (!res.ok || json.error) {
        setErrorMsg(json.error ?? "Error generando la rutina")
        return
      }
      await loadPlan()
      router.refresh()
    } catch {
      setErrorMsg("Error de red. Intenta de nuevo.")
    } finally {
      setGenerating(false)
    }
  }

  // ── Estados ───────────────────────────────────────────────────────────────

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mi rutina" backHref="/dashboard" backLabel="Volver al dashboard" />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{errorMsg ?? "Error desconocido"}</p>
            <Button variant="outline" className="mt-4" onClick={() => void loadPlan()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "no_plan") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mi rutina" backHref="/dashboard" backLabel="Volver al dashboard" />
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Aún no tienes una rutina</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              Genera tu plan personalizado basado en tu objetivo, nivel y días disponibles.
            </p>
            {errorMsg && (
              <p className="text-xs text-destructive mb-4">{errorMsg}</p>
            )}
            <Button onClick={() => void handleGenerate()} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generar mi rutina
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!plan) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi rutina" backHref="/dashboard" backLabel="Volver al dashboard" />

      {/* Plan header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Plan v{plan.version}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={generating}
              className="shrink-0"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Regenerar</span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="secondary">
              <Target className="mr-1 h-3 w-3" />
              {getObjetivoLabel(plan.goal as Parameters<typeof getObjetivoLabel>[0])}
            </Badge>
            <Badge variant="outline">
              {getExperienciaLabel(plan.experience as Parameters<typeof getExperienciaLabel>[0])}
            </Badge>
            <Badge variant="outline">
              <Calendar className="mr-1 h-3 w-3" />
              {plan.days_per_week} días/semana
            </Badge>
            <Badge variant="outline">
              <Clock className="mr-1 h-3 w-3" />
              {plan.days.length} sesiones
            </Badge>
          </div>
        </CardHeader>

        {/* Resumen de sesiones */}
        <CardContent>
          <div className="rounded-xl border bg-muted/20 p-4">
            <h3 className="mb-3 text-sm font-semibold">Estructura semanal</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {plan.days.map((day, i) => (
                <div key={day.id} className="rounded-lg border bg-background p-3">
                  <p className="text-xs font-medium text-primary">Sesión {i + 1}</p>
                  <p className="text-sm font-semibold">{day.name}</p>
                  {day.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{day.description}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{day.exercises.length} ejercicios</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Días con ejercicios */}
      <div className="grid gap-4">
        {plan.days.map((day, i) => (
          <WorkoutDaySection key={day.id} day={day} index={i} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  )
}
