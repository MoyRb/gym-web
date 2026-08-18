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
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getUserSafely } from "@/lib/supabase/auth-helpers"
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

// ── AI Generation UI helpers ──────────────────────────────────────────────────

interface AIGenProgress {
  phase: "idle" | "starting" | "batch" | "finalizing" | "done" | "error"
  generationId?: string
  totalBatches?: number
  completedBatches?: number
  countdown?: number
  errorMsg?: string
}

function AIGenButtonLabel({ progress }: { progress: AIGenProgress }) {
  if (progress.phase === "starting") return <>Iniciando...</>
  if (progress.phase === "finalizing") return <>Activando...</>
  if (progress.phase === "batch") {
    const { completedBatches = 0, totalBatches = 1, countdown } = progress
    if (countdown && countdown > 0) return <>Esperando {countdown}s...</>
    return <>Parte {completedBatches + 1} de {totalBatches}...</>
  }
  return <>Generando...</>
}

function AIGenStatusBanner({ progress, className }: { progress: AIGenProgress; className?: string }) {
  if (progress.phase === "idle" || progress.phase === "done" || progress.phase === "error") return null

  let message: string
  if (progress.phase === "starting") {
    message = "Preparando tu rutina personalizada con IA..."
  } else if (progress.phase === "finalizing") {
    message = "Activando tu nueva rutina..."
  } else {
    const { completedBatches = 0, totalBatches = 1, countdown } = progress
    if (countdown && countdown > 0) {
      message = `Esperando ${countdown} s antes de continuar...`
    } else {
      message = `Creando tu rutina — parte ${completedBatches + 1} de ${totalBatches}`
    }
  }

  return (
    <p className={`text-xs text-muted-foreground animate-pulse${className ? ` ${className}` : ""}`}>
      {message}
    </p>
  )
}

// ── Exercise Row ──────────────────────────────────────────────────────────────

function WorkoutExerciseRow({
  exercise,
  index,
}: {
  exercise: WorkoutPlanWithDays["days"][number]["exercises"][number]
  index: number
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
        {index + 1}
      </span>
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <Link
          href={`/dashboard/exercises/${exercise.exercise_id}`}
          className="text-sm font-medium leading-snug hover:text-primary transition-colors"
        >
          {exercise.exercise.name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="tabular font-medium text-foreground/80">
            {exercise.sets}×{formatReps(exercise.reps_min, exercise.reps_max, exercise.duration_seconds)}
          </span>
          <span className="text-border">·</span>
          <span>{formatRest(exercise.rest_seconds)} descanso</span>
          {exercise.notes && (
            <>
              <span className="text-border">·</span>
              <span className="italic">{exercise.notes}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Day Section ───────────────────────────────────────────────────────────────

function WorkoutDaySection({
  day,
  index,
  defaultOpen,
}: {
  day: WorkoutPlanWithDays["days"][number]
  index: number
  defaultOpen: boolean
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const handleStart = async () => {
    setStarting(true)
    setStartError(null)
    try {
      const res = await fetch("/api/workout/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_plan_day_id: day.id }),
      })
      const json = (await res.json()) as { sessionId?: string; error?: string }
      if (!res.ok || !json.sessionId) {
        setStartError(json.error ?? "Error iniciando entrenamiento")
        return
      }
      router.push(`/dashboard/rutina/entrenar/${json.sessionId}`)
    } catch {
      setStartError("Error de red. Intenta de nuevo.")
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      {/* Day header — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/30"
        aria-expanded={isOpen}
      >
        {/* Day number */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{day.name}</p>
          <p className="text-xs text-muted-foreground">
            {day.description ? `${day.description} · ` : ""}
            {day.exercises.length} ejercicio{day.exercises.length !== 1 ? "s" : ""}
          </p>
        </div>

        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="border-t border-border/50 px-4 pb-4">
          {startError && (
            <p className="mt-3 text-xs text-destructive">{startError}</p>
          )}

          {day.exercises.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              No se pudieron resolver ejercicios para esta sesión.
            </p>
          ) : (
            <div className="divide-y divide-border/40">
              {day.exercises.map((exercise, i) => (
                <WorkoutExerciseRow key={exercise.id} exercise={exercise} index={i} />
              ))}
            </div>
          )}

          {/* Iniciar CTA — full width, below exercises */}
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => void handleStart()}
            disabled={starting}
          >
            {starting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {starting ? "Iniciando..." : "Iniciar entrenamiento"}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type PageState = "loading" | "no_plan" | "active" | "error"
type AIGenState = "idle" | "generating" | "success" | "fallback" | "error"

export default function RutinaPage() {
  const router = useRouter()
  const [state, setState]           = useState<PageState>("loading")
  const [plan, setPlan]             = useState<WorkoutPlanWithDays | null>(null)
  const [generating, setGenerating] = useState(false)
  const [aiGenState, setAIGenState] = useState<AIGenState>("idle")
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const [aiProgress, setAIProgress] = useState<AIGenProgress>({ phase: "idle" })
  const [pendingGenId, setPendingGenId] = useState<string | null>(null)

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

  useEffect(() => { void loadPlan() }, [loadPlan])

  useEffect(() => {
    const stored = sessionStorage.getItem("ai_gen_id")
    if (stored) setPendingGenId(stored)
  }, [])

  useEffect(() => {
    if (aiProgress.phase !== "batch" || !aiProgress.countdown || aiProgress.countdown <= 0) return
    const timer = setTimeout(() => {
      setAIProgress((prev) => ({ ...prev, countdown: (prev.countdown ?? 1) - 1 }))
    }, 1000)
    return () => clearTimeout(timer)
  }, [aiProgress])

  const handleGenerate = async () => {
    setGenerating(true)
    setErrorMsg(null)
    setAIGenState("idle")
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

  const runBatches = async (generationId: string, totalBatches: number, startAt: number) => {
    let completedBatches = startAt
    while (completedBatches < totalBatches) {
      setAIProgress((prev) => ({
        ...prev,
        phase: "batch",
        generationId,
        totalBatches,
        completedBatches,
        countdown: undefined,
      }))

      const res = await fetch(`/api/workout/generate-ai/${generationId}/next`, { method: "POST" })

      if (res.status === 429) {
        const json = (await res.json()) as { error?: string; retryAfterSeconds?: number }
        const retryAfterSeconds = json.retryAfterSeconds ?? 60
        setAIProgress((prev) => ({
          ...prev,
          phase: "batch",
          countdown: retryAfterSeconds,
        }))
        await new Promise<void>((resolve) => setTimeout(resolve, retryAfterSeconds * 1000))
        continue
      }

      const json = (await res.json()) as {
        error?: string
        completedBatches?: number
        totalBatches?: number
        done?: boolean
      }

      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Error procesando el lote")
      }

      completedBatches = json.completedBatches ?? completedBatches + 1
    }
  }

  const handleGenerateAI = async () => {
    setAIGenState("generating")
    setAIProgress({ phase: "starting" })
    setErrorMsg(null)
    setPendingGenId(null)

    try {
      const startRes = await fetch("/api/workout/generate-ai/start", { method: "POST" })
      const startData = (await startRes.json()) as {
        error?: string
        generationId?: string
        draftPlanId?: string
        totalBatches?: number
        completedBatches?: number
        rateLimitInfo?: { remainingTokens: number | null; retryAfterSeconds: number | null }
      }

      if (!startRes.ok || startData.error || !startData.generationId) {
        throw new Error(startData.error ?? "Error iniciando la generación")
      }

      const { generationId, totalBatches = 1 } = startData
      let completedBatches = startData.completedBatches ?? 0

      sessionStorage.setItem("ai_gen_id", generationId)

      const startRateLimit = startData.rateLimitInfo?.retryAfterSeconds
      if (startRateLimit && startRateLimit > 0 && completedBatches === 0) {
        setAIProgress({ phase: "batch", generationId, totalBatches, completedBatches, countdown: startRateLimit })
        await new Promise<void>((resolve) => setTimeout(resolve, startRateLimit * 1000))
        completedBatches = 0
      }

      await runBatches(generationId, totalBatches, completedBatches)

      setAIProgress({ phase: "finalizing", generationId })
      const finalRes = await fetch(`/api/workout/generate-ai/${generationId}/finalize`, { method: "POST" })
      const finalData = (await finalRes.json()) as { error?: string; planId?: string }

      if (!finalRes.ok || finalData.error) {
        throw new Error(finalData.error ?? "Error activando la rutina")
      }

      sessionStorage.removeItem("ai_gen_id")
      setAIProgress({ phase: "done" })
      setAIGenState("success")
      await loadPlan()
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de red. Intenta de nuevo."
      setAIGenState("error")
      setAIProgress({ phase: "error", errorMsg: msg })
      setErrorMsg(msg)
    }
  }

  const handleResumeGeneration = async (genId: string) => {
    setPendingGenId(null)
    setAIGenState("generating")
    setAIProgress({ phase: "batch", generationId: genId })
    setErrorMsg(null)

    try {
      const checkRes = await fetch(`/api/workout/generate-ai/${genId}/next`, { method: "POST" })

      if (checkRes.status === 404 || checkRes.status === 403) {
        sessionStorage.removeItem("ai_gen_id")
        setPendingGenId(null)
        return
      }

      const checkData = (await checkRes.json()) as {
        error?: string
        completedBatches?: number
        totalBatches?: number
        done?: boolean
      }

      if (checkData.done) {
        setAIProgress({ phase: "finalizing", generationId: genId })
        const finalRes = await fetch(`/api/workout/generate-ai/${genId}/finalize`, { method: "POST" })
        const finalData = (await finalRes.json()) as { error?: string; planId?: string }
        if (!finalRes.ok || finalData.error) throw new Error(finalData.error ?? "Error finalizando")
      } else if (!checkRes.ok || checkData.error) {
        throw new Error(checkData.error ?? "Error al reanudar")
      } else {
        const totalBatches = checkData.totalBatches ?? 1
        const completedBatches = checkData.completedBatches ?? 0
        await runBatches(genId, totalBatches, completedBatches)

        setAIProgress({ phase: "finalizing", generationId: genId })
        const finalRes = await fetch(`/api/workout/generate-ai/${genId}/finalize`, { method: "POST" })
        const finalData = (await finalRes.json()) as { error?: string; planId?: string }
        if (!finalRes.ok || finalData.error) throw new Error(finalData.error ?? "Error finalizando")
      }

      sessionStorage.removeItem("ai_gen_id")
      setAIProgress({ phase: "done" })
      setAIGenState("success")
      await loadPlan()
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al reanudar"
      setAIGenState("error")
      setAIProgress({ phase: "error", errorMsg: msg })
      setErrorMsg(msg)
    }
  }

  const generatingAI = aiProgress.phase !== "idle" && aiProgress.phase !== "done" && aiProgress.phase !== "error"

  // ── Estados ────────────────────────────────────────────────────────────────

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
        <PageHeader title="Mi plan" backHref="/dashboard" backLabel="Inicio" />
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{errorMsg ?? "Error desconocido"}</p>
          <Button variant="outline" className="mt-4" onClick={() => void loadPlan()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (state === "no_plan") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Mi plan" backHref="/dashboard" backLabel="Inicio" />

        {/* Pending recovery banner */}
        {pendingGenId && aiProgress.phase === "idle" && (
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Tienes una generación en curso.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void handleResumeGeneration(pendingGenId)}
            >
              Continuar generación
            </Button>
          </div>
        )}

        {/* Empty state CTA */}
        <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Aún no tienes un plan</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              La IA analiza tu objetivo, nivel y días disponibles para crear un plan personalizado.
            </p>
          </div>

          {errorMsg && (
            <p className="text-xs text-destructive">{errorMsg}</p>
          )}

          <AIGenStatusBanner progress={aiProgress} />

          <div className="flex flex-col gap-3 w-full max-w-xs sm:flex-row sm:max-w-none sm:justify-center">
            <Button
              size="lg"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => void handleGenerateAI()}
              disabled={generatingAI || generating}
            >
              {generatingAI ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AIGenButtonLabel progress={aiProgress} />
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar con IA
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => void handleGenerate()}
              disabled={generating || generatingAI}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {generating ? "Generando..." : "Rutina base"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!plan) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi plan" backHref="/dashboard" backLabel="Inicio" />

      {/* Fallback notice */}
      {aiGenState === "fallback" && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Se generó una rutina base porque el generador inteligente no estuvo disponible.
        </div>
      )}

      {/* ── Plan Header ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        {/* Name + AI badge + actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold leading-tight">{plan.name}</h2>
              {plan.source === "ai" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  IA
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Plan v{plan.version}
            </p>
          </div>

          {/* Regenerate actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => void handleGenerateAI()}
              disabled={generatingAI || generating}
            >
              {generatingAI ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {generatingAI ? <AIGenButtonLabel progress={aiProgress} /> : "Nueva con IA"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleGenerate()}
              disabled={generating || generatingAI}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Base</span>
            </Button>
          </div>
        </div>

        {generatingAI && <AIGenStatusBanner progress={aiProgress} className="mt-2" />}

        {/* Metadata chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
            <Target className="h-3 w-3 text-primary" />
            {getObjetivoLabel(plan.goal as Parameters<typeof getObjetivoLabel>[0])}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
            {getExperienciaLabel(plan.experience as Parameters<typeof getExperienciaLabel>[0])}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {plan.days_per_week} días/semana
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {plan.days.length} sesiones
          </span>
        </div>

        {/* Weekly structure overview */}
        <div className="mt-5 border-t border-border/50 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Estructura semanal
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plan.days.map((day, i) => (
              <div
                key={day.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{day.name}</p>
                  {day.description && (
                    <p className="truncate text-[11px] text-muted-foreground">{day.description}</p>
                  )}
                </div>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular">
                  {day.exercises.length} ej.
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Day sections ── */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Sesiones de entrenamiento
        </p>
        {plan.days.map((day, i) => (
          <WorkoutDaySection key={day.id} day={day} index={i} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  )
}
