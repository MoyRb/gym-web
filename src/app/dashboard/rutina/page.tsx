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
    <Card className="border-border/70">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="flex flex-1 items-center gap-3 text-left"
          >
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
            <span className="ml-auto shrink-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
          </button>

          <Button
            size="sm"
            onClick={() => void handleStart()}
            disabled={starting}
            className="shrink-0"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Iniciar</span>
          </Button>
        </div>

        {startError && (
          <p className="mt-2 text-xs text-destructive">{startError}</p>
        )}
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
type AIGenState = "idle" | "generating" | "success" | "fallback" | "error"

export default function RutinaPage() {
  const router = useRouter()
  const [state, setState] = useState<PageState>("loading")
  const [plan, setPlan] = useState<WorkoutPlanWithDays | null>(null)
  const [generating, setGenerating] = useState(false)
  const [aiGenState, setAIGenState] = useState<AIGenState>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [aiProgress, setAIProgress] = useState<AIGenProgress>({ phase: "idle" })
  /** Pending generation ID recovered from sessionStorage on mount */
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

  // Recovery: check if a generation was in progress before page reload
  useEffect(() => {
    const stored = sessionStorage.getItem("ai_gen_id")
    if (stored) setPendingGenId(stored)
  }, [])

  // Countdown ticker — decrements every second while in rate-limit phase
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

  /** Runs all remaining batches sequentially, respecting rate limits. */
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
        // Wait for countdown (updated by effect) then retry
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

  /** Full chunked AI generation flow. */
  const handleGenerateAI = async () => {
    setAIGenState("generating")
    setAIProgress({ phase: "starting" })
    setErrorMsg(null)
    setPendingGenId(null)

    try {
      // Start generation (processes batch 0)
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

      // Persist for reload recovery
      sessionStorage.setItem("ai_gen_id", generationId)

      // Handle rate limit on start's first batch
      const startRateLimit = startData.rateLimitInfo?.retryAfterSeconds
      if (startRateLimit && startRateLimit > 0 && completedBatches === 0) {
        setAIProgress({ phase: "batch", generationId, totalBatches, completedBatches, countdown: startRateLimit })
        await new Promise<void>((resolve) => setTimeout(resolve, startRateLimit * 1000))
        completedBatches = 0 // retry batch 0 via /next
      }

      // Process remaining batches (including batch 0 retry if needed)
      await runBatches(generationId, totalBatches, completedBatches)

      // Finalize
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

  /** Resume a generation session that was left in progress (e.g., after page refresh). */
  const handleResumeGeneration = async (genId: string) => {
    setPendingGenId(null)
    setAIGenState("generating")
    setAIProgress({ phase: "batch", generationId: genId })
    setErrorMsg(null)

    try {
      // Fetch session state from server to know how many batches are left
      // We re-use the /next endpoint which checks completed_batches server-side
      // and returns done:true if already complete
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
        // All batches done, just finalize
        setAIProgress({ phase: "finalizing", generationId: genId })
        const finalRes = await fetch(`/api/workout/generate-ai/${genId}/finalize`, { method: "POST" })
        const finalData = (await finalRes.json()) as { error?: string; planId?: string }
        if (!finalRes.ok || finalData.error) throw new Error(finalData.error ?? "Error finalizando")
      } else if (!checkRes.ok || checkData.error) {
        throw new Error(checkData.error ?? "Error al reanudar")
      } else {
        // Continue from where we left off
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

  /** Derived loading flag — true while any AI generation is running */
  const generatingAI = aiProgress.phase !== "idle" && aiProgress.phase !== "done" && aiProgress.phase !== "error"

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
            <AIGenStatusBanner progress={aiProgress} />
            {pendingGenId && aiProgress.phase === "idle" && (
              <div className="mb-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => void handleGenerateAI()}
                disabled={generatingAI || generating}
              >
                {generatingAI ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <AIGenButtonLabel progress={aiProgress} />
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generar rutina con IA
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleGenerate()}
                disabled={generating || generatingAI}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Rutina base
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!plan) return null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi rutina" backHref="/dashboard" backLabel="Volver al dashboard" />

      {/* Fallback notice (transient — only shown after AI gen in this session) */}
      {aiGenState === "fallback" && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Se generó una rutina base porque el generador inteligente no estuvo disponible.
        </div>
      )}

      {/* Plan header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.source === "ai" && (
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    <Sparkles className="mr-1 h-2.5 w-2.5" />
                    IA
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Plan v{plan.version}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => void handleGenerateAI()}
                disabled={generatingAI || generating}
              >
                {generatingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">
                  {generatingAI ? <AIGenButtonLabel progress={aiProgress} /> : "Nueva con IA"}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={generating || generatingAI}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">Base</span>
              </Button>
            </div>
          </div>

          {generatingAI && <AIGenStatusBanner progress={aiProgress} className="mt-2" />}

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
