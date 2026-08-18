"use client"

import { useEffect, useState, useCallback, useRef, memo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
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

// ── Rest Timer — FORGE fullscreen ─────────────────────────────────────────────

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
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background">
      {/* Ambient red glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[38%] h-[45vh] w-[45vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.10] blur-[100px]" />
      </div>

      <div className="relative flex flex-col items-center gap-6 px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Tiempo de descanso
        </p>

        {/* Big timer — the protagonist */}
        <span className="tabular font-black leading-none text-primary"
          style={{ fontSize: "clamp(72px, 18vw, 120px)" }}
        >
          {formatDuration(remaining)}
        </span>

        {/* Progress arc alternative — progress bar */}
        <div className="h-0.5 w-48 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000"
            style={{ width: `${Math.max(0, (remaining / initialSeconds) * 100)}%` }}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={add30}>
            <Plus className="mr-1 h-4 w-4" />
            +30s
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Reiniciar
          </Button>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          <SkipForward className="h-4 w-4" />
          Saltar descanso
        </button>
      </div>
    </div>
  )
}

// ── Exercise GIF — large, prominent ──────────────────────────────────────────

const ExerciseGif = memo(function ExerciseGif({
  exerciseId,
  exerciseName,
}: {
  exerciseId: string
  exerciseName: string
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "none">("loading")
  const [gifUrl, setGifUrl] = useState<string | null>(null)

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
        className="mx-auto mt-4 aspect-square w-full max-w-[240px] sm:max-w-[272px] rounded-xl bg-muted animate-pulse"
      />
    )
  }

  if (status === "none" || !gifUrl) return null

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={gifUrl}
        alt={`Demostración de ${exerciseName}`}
        className="aspect-square w-full max-w-[240px] sm:max-w-[272px] rounded-xl border border-border/60 object-contain bg-muted/20 motion-reduce:hidden"
      />
      {/* Reduced motion fallback */}
      <div className="hidden motion-reduce:flex aspect-square w-full max-w-[240px] items-center justify-center rounded-xl bg-muted/20 border border-border/60">
        <p className="text-xs text-muted-foreground text-center px-6">{exerciseName}</p>
      </div>
    </div>
  )
})

// ── Set Row — touch-friendly ──────────────────────────────────────────────────

interface SetState {
  weight_kg: string
  reps: string
  rir: string
  completed: boolean
  saving: boolean
}

const INPUT_CLS =
  "h-11 w-full rounded-md border border-input bg-background px-2 text-center text-base focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 sm:text-sm"

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
      className={`grid grid-cols-[2.5rem_1fr_1fr_1fr_2.75rem] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
        localState.completed ? "bg-primary/[0.07]" : "bg-muted/30"
      }`}
    >
      {/* Set number */}
      <span
        className={`text-center text-xs font-bold ${
          localState.completed ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {set.set_number}
      </span>

      {/* Weight */}
      <input
        type="number"
        inputMode="decimal"
        placeholder="kg"
        min={0}
        step={0.5}
        value={localState.weight_kg}
        onChange={(e) => onChange("weight_kg", e.target.value)}
        disabled={localState.completed}
        className={INPUT_CLS}
      />

      {/* Reps */}
      <input
        type="number"
        inputMode="numeric"
        placeholder="reps"
        min={1}
        value={localState.reps}
        onChange={(e) => onChange("reps", e.target.value)}
        disabled={localState.completed}
        className={INPUT_CLS}
      />

      {/* RIR */}
      <input
        type="number"
        inputMode="numeric"
        placeholder="RIR"
        min={0}
        max={10}
        value={localState.rir}
        onChange={(e) => onChange("rir", e.target.value)}
        disabled={localState.completed}
        className={INPUT_CLS}
      />

      {/* Complete button — 44px touch target */}
      <button
        type="button"
        onClick={onComplete}
        disabled={localState.saving}
        className="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
        aria-label={localState.completed ? "Serie completada" : "Completar serie"}
      >
        {localState.saving ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : localState.completed ? (
          <CheckCircle2 className="h-6 w-6 text-primary" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors hover:border-primary/50">
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
    <div
      className={`overflow-hidden rounded-xl border border-border/70 bg-card transition-opacity ${
        allDone ? "opacity-75" : ""
      }`}
    >
      {/* Card header — name, target, GIF */}
      <div className="px-4 pt-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/exercises/${exercise.exercise_id}`}
              className="text-base font-bold leading-snug transition-colors hover:text-primary line-clamp-2"
            >
              {exercise.exercise.name}
            </Link>
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

          {allDone ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              <CheckCircle2 className="h-3 w-3" />
              Listo
            </span>
          ) : (
            <Link
              href={`/dashboard/exercises/${exercise.exercise_id}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Ver ${exercise.exercise.name}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* GIF — the protagonist */}
        <ExerciseGif
          exerciseId={exercise.exercise_id}
          exerciseName={exercise.exercise.name}
        />
      </div>

      {/* Set logger */}
      <div className="mt-4 border-t border-border/50 px-4 pb-4 pt-3">
        {/* Column headers */}
        <div className="mb-2 grid grid-cols-[2.5rem_1fr_1fr_1fr_2.75rem] gap-2 px-2">
          {["#", "kg", "reps", "RIR", ""].map((h, i) => (
            <span
              key={i}
              className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {h}
            </span>
          ))}
        </div>

        <div className="space-y-1.5">
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
        </div>
      </div>
    </div>
  )
}

// ── Workout Summary ───────────────────────────────────────────────────────────

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

  const stats = [
    {
      label: "Duración",
      value: session.duration_seconds ? formatDuration(session.duration_seconds) : "—",
    },
    { label: "Series",       value: completedSets.length },
    { label: "Repeticiones", value: totalReps },
    { label: "Volumen",      value: `${Math.round(totalVolume)} kg` },
  ]

  return (
    <div className="flex flex-col items-center gap-8 px-4 py-16 text-center">
      {/* Check icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <CheckCircle2 className="h-10 w-10 text-primary" />
      </div>

      <div>
        <h2 className="text-2xl font-bold">¡Entrenamiento completado!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {new Date(session.started_at).toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      </div>

      {/* Stats 2×2 */}
      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="tabular text-2xl font-bold">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => router.push("/dashboard/progress")}
        >
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

  const [pageState, setPageState]     = useState<PageState>("loading")
  const [session, setSession]         = useState<WorkoutSessionWithExercises | null>(null)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [setStates, setSetStates]     = useState<Map<string, SetState>>(new Map())
  const [elapsed, setElapsed]         = useState(0)
  const [restTimer, setRestTimer]     = useState<{ active: boolean; seconds: number } | null>(null)
  const [finishing, setFinishing]     = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)

  // ── Load session ────────────────────────────────────────────────────────────

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
            sets: (ex.workout_sets ?? []).sort((a, b) => a.set_number - b.set_number),
          })),
      }

      setSession(shaped)

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

  useEffect(() => { void loadSession() }, [loadSession])

  // ── Elapsed timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (pageState !== "training" || !session) return
    const start = new Date(session.started_at).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [pageState, session])

  // ── Set handlers ────────────────────────────────────────────────────────────

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
      const res = await fetch(`/api/workout/sessions/${sessionId}/sets/${setId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
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

  // ── Finish / Cancel ─────────────────────────────────────────────────────────

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
      await loadSession()
    } finally {
      setFinishing(false)
      setConfirmFinish(false)
    }
  }

  // ── Render states ───────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (pageState === "error") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-sm text-destructive text-center">{errorMsg}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/rutina")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a mi rutina
        </Button>
      </div>
    )
  }

  if (!session) return null

  if (pageState === "summary") {
    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
        <div className="mx-auto max-w-lg">
          <WorkoutSummary session={session} setStates={setStates} />
        </div>
      </div>
    )
  }

  // ── Training state ──────────────────────────────────────────────────────────

  const totalSets     = session.exercises.flatMap((e) => e.sets).length
  const completedSets = session.exercises
    .flatMap((e) => e.sets)
    .filter((s) => setStates.get(s.id)?.completed ?? s.completed).length
  const incompleteSets = totalSets - completedSets
  const hasIncomplete  = incompleteSets > 0

  // Focus mode — covers sidebar and mobile bottom nav
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      {/* Rest timer overlay */}
      {restTimer?.active && (
        <RestTimer
          initialSeconds={restTimer.seconds}
          onDone={() => setRestTimer(null)}
        />
      )}

      {/* ── Top bar ── */}
      <div className="flex-none border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          {/* Exit */}
          <Link
            href="/dashboard/rutina"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Salir del entrenamiento"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold">
              {session.exercises[0]?.exercise?.body_part ?? "Entrenamiento"}
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="tabular">{formatDuration(elapsed)}</span>
              </span>
              <span className="tabular">{completedSets}/{totalSets} series</span>
            </div>
          </div>

          <Dumbbell className="h-5 w-5 shrink-0 text-primary" />
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: totalSets > 0 ? `${(completedSets / totalSets) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* ── Scrollable exercise list ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 pb-6">
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
        </div>
      </div>

      {/* ── Footer — finish / cancel ── */}
      <div className="flex-none border-t border-border bg-background/95 backdrop-blur-sm">
        <div
          className="mx-auto max-w-2xl px-4 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {confirmFinish ? (
            <div className="flex flex-col gap-2">
              {hasIncomplete && (
                <p className="text-center text-sm text-muted-foreground">
                  {incompleteSets}{" "}
                  {incompleteSets === 1 ? "serie sin completar" : "series sin completar"}.
                  ¿Finalizar igualmente?
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
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => void handleFinish("complete")}
                  disabled={finishing}
                >
                  {finishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Sí, finalizar"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Cancel workout */}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => void handleFinish("cancel")}
                disabled={finishing}
                aria-label="Cancelar entrenamiento"
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Finish */}
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
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
    </div>
  )
}
