"use client"

import { useEffect, useState, useCallback, useRef, memo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Loader2,
  Plus,
  SkipForward,
  RotateCcw,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getUserSafely } from "@/lib/supabase/auth-helpers"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { WorkoutSessionWithExercises, WorkoutSetRow } from "@/types/database"

// ── Formatters ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function formatTarget(
  repsMin: number | null,
  repsMax: number | null,
  duration: number | null,
): string {
  if (duration) return `${duration} s`
  if (repsMin != null && repsMax != null) {
    return repsMin === repsMax ? `${repsMin} reps` : `${repsMin}–${repsMax} reps`
  }
  if (repsMin != null) return `${repsMin} reps`
  return "—"
}

// ── Rest Timer ────────────────────────────────────────────────────────────────

function RestTimer({
  initialSeconds,
  onDone,
}: {
  initialSeconds: number
  onDone: () => void
}) {
  const [remaining, setRemaining] = useState(initialSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!)
          onDone()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [onDone])

  const add30 = () => setRemaining((r) => r + 30)
  const reset = () => setRemaining(initialSeconds)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Descanso</p>
        <span className="text-7xl font-bold tabular-nums text-primary">
          {formatDuration(remaining)}
        </span>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={add30}>
            <Plus className="h-4 w-4 mr-1" />
            +30s
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reiniciar
          </Button>
          <Button variant="default" size="sm" onClick={onDone}>
            <SkipForward className="h-4 w-4 mr-1" />
            Saltar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Exercise GIF ──────────────────────────────────────────────────────────────
// Carga el GIF via API route server-side (signed URL). El service_role nunca
// llega al cliente. Hace UN fetch por ejercicio al montar el card.

const ExerciseGif = memo(function ExerciseGif({
  exerciseId,
  exerciseName,
}: {
  exerciseId: string
  exerciseName: string
}) {
  const [status, setStatus]   = useState<"loading" | "ready" | "none">("loading")
  const [gifUrl, setGifUrl]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/exercises/${exerciseId}/gif`)
      .then((r) => (r.ok ? (r.json() as Promise<{ url: string | null }>) : null))
      .then((data) => {
        if (cancelled) return
        if (data?.url) {
          setGifUrl(data.url)
          setStatus("ready")
        } else {
          setStatus("none")
        }
      })
      .catch(() => { if (!cancelled) setStatus("none") })
    return () => { cancelled = true }
  }, [exerciseId])

  if (status === "loading") {
    return (
      <div
        aria-hidden="true"
        className="mx-auto mt-3 h-40 w-40 rounded-lg bg-muted animate-pulse"
      />
    )
  }

  if (status === "none" || !gifUrl) return null

  return (
    <div className="mt-3 flex justify-center">
      {/* next/image no soporta GIFs animados correctamente — se usa <img> */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gifUrl}
        alt={`Demostración de ${exerciseName}`}
        className="h-40 w-40 rounded-lg border border-border object-contain bg-muted/30 motion-reduce:hidden"
      />
    </div>
  )
})

// ── Set Row ───────────────────────────────────────────────────────────────────

interface SetState {
  weight_kg: string
  reps: string
  rir: string
  completed: boolean
  saving: boolean
}

function SetRow({
  set,
  localState,
  onChange,
  onComplete,
}: {
  set: WorkoutSetRow
  localState: SetState
  onChange: (field: keyof Omit<SetState, "completed" | "saving">, value: string) => void
  onComplete: () => void
}) {
  return (
    <div
      className={`grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] items-center gap-1.5 rounded-lg px-2 py-2 ${
        localState.completed ? "bg-primary/5" : "bg-muted/30"
      }`}
    >
      {/* Set number */}
      <span className="text-center text-xs font-semibold text-muted-foreground">
        {set.set_number}
      </span>

      {/* Weight */}
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          placeholder="kg"
          min={0}
          step={0.5}
          value={localState.weight_kg}
          onChange={(e) => onChange("weight_kg", e.target.value)}
          disabled={localState.completed}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>

      {/* Reps */}
      <div>
        <input
          type="number"
          inputMode="numeric"
          placeholder="reps"
          min={1}
          value={localState.reps}
          onChange={(e) => onChange("reps", e.target.value)}
          disabled={localState.completed}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>

      {/* RIR */}
      <div>
        <input
          type="number"
          inputMode="numeric"
          placeholder="RIR"
          min={0}
          max={10}
          value={localState.rir}
          onChange={(e) => onChange("rir", e.target.value)}
          disabled={localState.completed}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        />
      </div>

      {/* Complete button */}
      <button
        type="button"
        onClick={onComplete}
        disabled={localState.saving}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
      >
        {localState.saving ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : localState.completed ? (
          <CheckCircle2 className="h-5 w-5 text-primary" />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/40 text-muted-foreground/40">
            <span className="sr-only">Completar</span>
          </span>
        )}
      </button>
    </div>
  )
}

// ── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  setStates,
  onSetChange,
  onSetComplete,
}: {
  exercise: WorkoutSessionWithExercises["exercises"][number]
  setStates: Map<string, SetState>
  onSetChange: (setId: string, field: keyof Omit<SetState, "completed" | "saving">, value: string) => void
  onSetComplete: (setId: string) => void
}) {
  const completedCount = exercise.sets.filter((s) => setStates.get(s.id)?.completed).length
  const allDone = completedCount === exercise.sets.length && exercise.sets.length > 0

  return (
    <Card className={`border-border/70 ${allDone ? "opacity-80" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/dashboard/exercises/${exercise.exercise_id}`}
                className="text-sm font-semibold hover:text-primary hover:underline truncate"
              >
                {exercise.exercise.name}
              </Link>
              {allDone && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Listo
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {exercise.target_sets ?? "?"} series ·{" "}
              {formatTarget(
                exercise.target_reps_min,
                exercise.target_reps_max,
                exercise.target_duration_seconds,
              )}
              {exercise.target_rest_seconds
                ? ` · ${exercise.target_rest_seconds}s descanso`
                : ""}
            </p>
          </div>
          <Link
            href={`/dashboard/exercises/${exercise.exercise_id}`}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* GIF de demostración — visible para entender el movimiento */}
        <ExerciseGif
          exerciseId={exercise.exercise_id}
          exerciseName={exercise.exercise.name}
        />

        {/* Column headers */}
        <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] gap-1.5 px-2">
          <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">#</span>
          <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">kg</span>
          <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">reps</span>
          <span className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">RIR</span>
          <span />
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5 pt-0">
        {exercise.sets.map((set) => (
          <SetRow
            key={set.id}
            set={set}
            localState={
              setStates.get(set.id) ?? {
                weight_kg: set.weight_kg != null ? String(set.weight_kg) : "",
                reps:      set.reps      != null ? String(set.reps)      : "",
                rir:       set.rir       != null ? String(set.rir)       : "",
                completed: set.completed,
                saving:    false,
              }
            }
            onChange={(field, value) => onSetChange(set.id, field, value)}
            onComplete={() => onSetComplete(set.id)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

// ── Summary ───────────────────────────────────────────────────────────────────

function WorkoutSummary({
  session,
  setStates,
}: {
  session: WorkoutSessionWithExercises
  setStates: Map<string, SetState>
}) {
  const router = useRouter()
  const allSets = session.exercises.flatMap((e) => e.sets)
  const completedSets = allSets.filter((s) => setStates.get(s.id)?.completed ?? s.completed)
  const totalReps = completedSets.reduce((acc, s) => {
    const state = setStates.get(s.id)
    const reps = state?.reps ? parseInt(state.reps, 10) : (s.reps ?? 0)
    return acc + (isNaN(reps) ? 0 : reps)
  }, 0)
  const totalVolume = completedSets.reduce((acc, s) => {
    const state = setStates.get(s.id)
    const kg = state?.weight_kg ? parseFloat(state.weight_kg) : (s.weight_kg ?? 0)
    const reps = state?.reps ? parseInt(state.reps, 10) : (s.reps ?? 0)
    if (!isNaN(kg) && !isNaN(reps) && kg > 0 && reps > 0) return acc + kg * reps
    return acc
  }, 0)

  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <CheckCircle2 className="h-16 w-16 text-primary" />
      <div>
        <h2 className="text-2xl font-bold">Entrenamiento completado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(session.started_at).toLocaleDateString("es-ES", {
            weekday: "long", day: "numeric", month: "long",
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-2xl font-bold">{session.duration_seconds ? formatDuration(session.duration_seconds) : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Duración</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-2xl font-bold">{completedSets.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Series</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-2xl font-bold">{totalReps}</p>
          <p className="text-xs text-muted-foreground mt-1">Repeticiones</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-2xl font-bold">{Math.round(totalVolume)} kg</p>
          <p className="text-xs text-muted-foreground mt-1">Volumen</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={() => router.push("/dashboard/progress")}>
          Ver mi progreso
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard/rutina")}>
          Volver a mi rutina
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type PageState = "loading" | "training" | "summary" | "error"

export default function TrainingPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : ""

  const [pageState, setPageState] = useState<PageState>("loading")
  const [session, setSession] = useState<WorkoutSessionWithExercises | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [setStates, setSetStates] = useState<Map<string, SetState>>(new Map())
  const [elapsed, setElapsed] = useState(0)
  const [restTimer, setRestTimer] = useState<{ active: boolean; seconds: number } | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)

  // Load session
  const loadSession = useCallback(async () => {
    try {
      const supabase = createClient()
      const user = await getUserSafely(supabase, "TrainingPage")
      if (!user) {
        setErrorMsg("Sin sesión activa")
        setPageState("error")
        return
      }

      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
          id, user_id, workout_plan_id, workout_plan_day_id,
          status, started_at, completed_at, duration_seconds, notes,
          created_at, updated_at,
          workout_session_exercises (
            id, workout_session_id, workout_plan_exercise_id, exercise_id,
            sort_order, target_sets, target_reps_min, target_reps_max,
            target_duration_seconds, target_rest_seconds, notes,
            created_at, updated_at,
            exercises ( id, name, body_part, equipment, target, muscle_group ),
            workout_sets (
              id, workout_session_exercise_id, set_number, set_type,
              weight_kg, reps, duration_seconds, rir, rpe,
              completed, completed_at, notes, created_at, updated_at
            )
          )
        `)
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle()

      if (error || !data) {
        setErrorMsg("Sesión no encontrada")
        setPageState("error")
        return
      }

      // Shape data
      const raw = data as unknown as {
        workout_session_exercises: Array<{
          exercises: WorkoutSessionWithExercises["exercises"][number]["exercise"]
          workout_sets: WorkoutSetRow[]
          [key: string]: unknown
        }>
        [key: string]: unknown
      }

      const shaped: WorkoutSessionWithExercises = {
        ...(data as unknown as WorkoutSessionWithExercises),
        exercises: (raw.workout_session_exercises ?? [])
          .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
          .map((ex) => ({
            ...(ex as unknown as WorkoutSessionWithExercises["exercises"][number]),
            exercise: ex.exercises,
            sets: (ex.workout_sets ?? []).sort(
              (a, b) => a.set_number - b.set_number,
            ),
          })),
      }

      setSession(shaped)

      // Init local set states
      const initStates = new Map<string, SetState>()
      for (const ex of shaped.exercises) {
        for (const s of ex.sets) {
          initStates.set(s.id, {
            weight_kg: s.weight_kg != null ? String(s.weight_kg) : "",
            reps:      s.reps      != null ? String(s.reps)      : "",
            rir:       s.rir       != null ? String(s.rir)       : "",
            completed: s.completed,
            saving:    false,
          })
        }
      }
      setSetStates(initStates)

      if (shaped.status === "completed" || shaped.status === "cancelled") {
        setPageState("summary")
      } else {
        setPageState("training")
      }
    } catch {
      setErrorMsg("Error cargando la sesión")
      setPageState("error")
    }
  }, [sessionId])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  // Elapsed timer
  useEffect(() => {
    if (pageState !== "training" || !session) return
    const start = new Date(session.started_at).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pageState, session])

  // ── Set handlers ──────────────────────────────────────────────────────────

  const handleSetChange = (
    setId: string,
    field: keyof Omit<SetState, "completed" | "saving">,
    value: string,
  ) => {
    setSetStates((prev) => {
      const next = new Map(prev)
      const cur = next.get(setId)
      if (cur) next.set(setId, { ...cur, [field]: value })
      return next
    })
  }

  const handleSetComplete = async (setId: string, restSeconds: number) => {
    const state = setStates.get(setId)
    if (!state || state.completed || state.saving) return

    // Optimistic update
    setSetStates((prev) => {
      const next = new Map(prev)
      const cur = next.get(setId)
      if (cur) next.set(setId, { ...cur, saving: true })
      return next
    })

    const payload: Record<string, unknown> = {
      completed: true,
      weight_kg: state.weight_kg ? parseFloat(state.weight_kg) : null,
      reps:      state.reps      ? parseInt(state.reps, 10)    : null,
      rir:       state.rir       ? parseInt(state.rir, 10)      : null,
    }

    try {
      const res = await fetch(
        `/api/workout/sessions/${sessionId}/sets/${setId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      if (!res.ok) {
        // Roll back
        setSetStates((prev) => {
          const next = new Map(prev)
          const cur = next.get(setId)
          if (cur) next.set(setId, { ...cur, saving: false })
          return next
        })
        return
      }

      setSetStates((prev) => {
        const next = new Map(prev)
        const cur = next.get(setId)
        if (cur) next.set(setId, { ...cur, completed: true, saving: false })
        return next
      })

      if (restSeconds > 0) {
        setRestTimer({ active: true, seconds: restSeconds })
      }
    } catch {
      setSetStates((prev) => {
        const next = new Map(prev)
        const cur = next.get(setId)
        if (cur) next.set(setId, { ...cur, saving: false })
        return next
      })
    }
  }

  // ── Finish / Cancel ───────────────────────────────────────────────────────

  const handleFinish = async (action: "complete" | "cancel") => {
    if (finishing) return
    setFinishing(true)
    try {
      const res = await fetch(`/api/workout/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) return

      // Reload to get updated session
      await loadSession()
    } finally {
      setFinishing(false)
      setConfirmFinish(false)
    }
  }

  // ── Render states ─────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (pageState === "error") {
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/rutina")}>
              Volver a mi rutina
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) return null

  if (pageState === "summary") {
    return (
      <div className="mx-auto max-w-lg">
        <WorkoutSummary session={session} setStates={setStates} />
      </div>
    )
  }

  // Count progress
  const totalSets     = session.exercises.flatMap((e) => e.sets).length
  const completedSets = session.exercises
    .flatMap((e) => e.sets)
    .filter((s) => setStates.get(s.id)?.completed ?? s.completed).length

  const incompleteSets = totalSets - completedSets
  const hasIncomplete  = incompleteSets > 0

  return (
    <div className="flex flex-col gap-4 pb-32">
      {/* Rest timer overlay */}
      {restTimer?.active && (
        <RestTimer
          initialSeconds={restTimer.seconds}
          onDone={() => setRestTimer(null)}
        />
      )}

      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 bg-background/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">
              {session.workout_plan_day_id ? (
                <span>{session.exercises[0]?.exercise?.body_part ?? "Entrenamiento"}</span>
              ) : (
                "Entrenamiento libre"
              )}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(elapsed)}
              </span>
              <span>
                {completedSets}/{totalSets} series
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary shrink-0" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Exercises */}
      {session.exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          setStates={setStates}
          onSetChange={handleSetChange}
          onSetComplete={(setId) =>
            void handleSetComplete(setId, exercise.target_rest_seconds ?? 60)
          }
        />
      ))}

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:pb-4">
        {confirmFinish ? (
          <div className="flex flex-col gap-2 max-w-lg mx-auto">
            {hasIncomplete && (
              <p className="text-center text-sm text-muted-foreground">
                {incompleteSets} {incompleteSets === 1 ? "serie sin completar" : "series sin completar"}. ¿Deseas finalizar igualmente?
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmFinish(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => void handleFinish("complete")}
                disabled={finishing}
              >
                {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, finalizar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 max-w-lg mx-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => void handleFinish("cancel")}
              disabled={finishing}
            >
              <X className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Cancelar entreno</span>
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                if (hasIncomplete) {
                  setConfirmFinish(true)
                } else {
                  void handleFinish("complete")
                }
              }}
              disabled={finishing}
            >
              {finishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Finalizar entrenamiento"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
