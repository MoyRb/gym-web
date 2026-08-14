import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock, Dumbbell } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getHistorySession } from "@/lib/workouts/sessions/history"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const runtime = "nodejs"

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

export default async function SessionDetailPage({ params }: RouteContext) {
  const { sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const data = await getHistorySession(sessionId, user.id)
  if (!data) notFound()

  const session = data as unknown as {
    id: string
    started_at: string
    completed_at: string | null
    duration_seconds: number | null
    status: string
    notes: string | null
    workout_plan_days: { name: string; description: string | null } | null
    workout_session_exercises: Array<{
      id: string
      sort_order: number
      target_sets: number | null
      target_reps_min: number | null
      target_reps_max: number | null
      target_duration_seconds: number | null
      notes: string | null
      exercises: { id: string; name: string; body_part: string; target: string }
      workout_sets: Array<{
        id: string
        set_number: number
        set_type: string
        weight_kg: number | null
        reps: number | null
        duration_seconds: number | null
        rir: number | null
        rpe: number | null
        completed: boolean
        notes: string | null
      }>
    }>
  }

  const exercises = (session.workout_session_exercises ?? []).sort(
    (a, b) => a.sort_order - b.sort_order,
  )

  const allSets      = exercises.flatMap((e) => e.workout_sets ?? [])
  const completedSets = allSets.filter((s) => s.completed)
  const totalVolume   = completedSets.reduce((acc, s) => {
    if (s.weight_kg != null && s.reps != null) return acc + s.weight_kg * s.reps
    return acc
  }, 0)
  const totalReps = completedSets.reduce((acc, s) => acc + (s.reps ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/progress"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al progreso
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">
              {session.workout_plan_days?.name ?? "Entrenamiento libre"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(session.started_at).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Badge variant={session.status === "completed" ? "default" : "secondary"}>
            {session.status === "completed" ? "Completado" : "Cancelado"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-muted/20 p-4 text-center">
          <Clock className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{formatDuration(session.duration_seconds)}</p>
          <p className="text-xs text-muted-foreground">Duración</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4 text-center">
          <CheckCircle2 className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{completedSets.length}/{allSets.length}</p>
          <p className="text-xs text-muted-foreground">Series</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4 text-center">
          <Dumbbell className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-lg font-bold">{totalReps}</p>
          <p className="text-xs text-muted-foreground">Repeticiones</p>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4 text-center">
          <p className="text-lg font-bold">{Math.round(totalVolume)} kg</p>
          <p className="text-xs text-muted-foreground">Volumen</p>
        </div>
      </div>

      {/* Exercises — read only */}
      <div className="flex flex-col gap-4">
        {exercises.map((exercise) => {
          const sets = (exercise.workout_sets ?? []).sort((a, b) => a.set_number - b.set_number)
          return (
            <Card key={exercise.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  <Link
                    href={`/dashboard/exercises/${exercise.exercises.id}`}
                    className="hover:text-primary hover:underline"
                  >
                    {exercise.exercises.name}
                  </Link>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {exercise.exercises.body_part} · {exercise.exercises.target}
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Table header */}
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr] gap-2 px-2 mb-1.5">
                  {["#", "kg", "reps", "RIR", ""].map((h, i) => (
                    <span key={i} className="text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </span>
                  ))}
                </div>
                {sets.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Sin series registradas</p>
                ) : (
                  <div className="space-y-1">
                    {sets.map((s) => (
                      <div
                        key={s.id}
                        className={`grid grid-cols-[2rem_1fr_1fr_1fr_1fr] items-center gap-2 rounded-lg px-2 py-2 text-sm ${
                          s.completed ? "bg-primary/5" : "bg-muted/20 opacity-50"
                        }`}
                      >
                        <span className="text-center text-xs font-medium text-muted-foreground">
                          {s.set_number}
                        </span>
                        <span className="text-center">{s.weight_kg ?? "—"}</span>
                        <span className="text-center">{s.reps ?? "—"}</span>
                        <span className="text-center">{s.rir ?? "—"}</span>
                        <span className="text-center">
                          {s.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <span className="text-muted-foreground/40">○</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
