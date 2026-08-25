"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronUp,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  Dumbbell,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/PageHeader"
import type { Objetivo, Experiencia } from "@/types"
import type { ExerciseRow } from "@/types/database"

// ── Types ─────────────────────────────────────────────────────────────────────

type ExerciseSummary = Pick<ExerciseRow, "id" | "name" | "body_part" | "equipment">

interface PlanExercise {
  localId: string
  exerciseId: string
  exerciseName: string
  exerciseBodyPart: string
  exerciseEquipment: string
  sets: number
  repsMin: number | null
  repsMax: number | null
  durationSeconds: number | null
  restSeconds: number
  rir: number | null
  notes: string
}

interface PlanDay {
  localId: string
  name: string
  exercises: PlanExercise[]
}

// ── Label helpers ─────────────────────────────────────────────────────────────

const GOAL_OPTIONS: { value: Objetivo; label: string }[] = [
  { value: "ganar_masa_muscular",     label: "Ganar masa muscular" },
  { value: "bajar_grasa",             label: "Bajar grasa" },
  { value: "mejorar_resistencia",     label: "Mejorar resistencia" },
  { value: "mejorar_condicion_general", label: "Mejorar condición general" },
]

const EXPERIENCE_OPTIONS: { value: Experiencia; label: string }[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio",   label: "Intermedio" },
  { value: "avanzado",     label: "Avanzado" },
]

const BODY_PART_ES: Record<string, string> = {
  back:          "Espalda",
  cardio:        "Cardio",
  chest:         "Pecho",
  "lower arms":  "Antebrazo",
  "lower legs":  "Pierna inferior",
  neck:          "Cuello",
  shoulders:     "Hombros",
  "upper arms":  "Brazo",
  "upper legs":  "Pierna superior",
  waist:         "Cintura / Core",
}

const EQUIPMENT_ES: Record<string, string> = {
  assisted:           "Asistido",
  band:               "Banda",
  barbell:            "Barra",
  "body weight":      "Peso corporal",
  cable:              "Cable",
  dumbbell:           "Mancuernas",
  kettlebell:         "Kettlebell",
  "leverage machine": "Máquina",
  "olympic barbell":  "Barra olímpica",
  "resistance band":  "Banda elástica",
  "smith machine":    "Máquina Smith",
  "stability ball":   "Fitball",
}

function t(map: Record<string, string>, v: string): string {
  return map[v.toLowerCase()] ?? v
}

function uid(): string {
  return Math.random().toString(36).slice(2)
}

function defaultExercise(ex: ExerciseSummary): PlanExercise {
  return {
    localId: uid(),
    exerciseId: ex.id,
    exerciseName: ex.name,
    exerciseBodyPart: ex.body_part,
    exerciseEquipment: ex.equipment,
    sets: 3,
    repsMin: 8,
    repsMax: 12,
    durationSeconds: null,
    restSeconds: 90,
    rir: null,
    notes: "",
  }
}

// ── Exercise Selector Dialog ──────────────────────────────────────────────────

interface ExerciseSelectorProps {
  onSelect: (ex: ExerciseSummary) => void
  onClose: () => void
}

const KNOWN_BODY_PARTS = [
  "back", "chest", "shoulders", "upper arms", "lower arms",
  "upper legs", "lower legs", "waist", "cardio",
]

function ExerciseSelector({ onSelect, onClose }: ExerciseSelectorProps) {
  const [q, setQ] = useState("")
  const [bodyPart, setBodyPart] = useState("")
  const [results, setResults] = useState<ExerciseSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const search = useCallback(async (query: string, bp: string) => {
    setLoading(true)
    setSearched(true)
    try {
      const supabase = createClient()
      let dbQ = supabase
        .from("exercises")
        .select("id, name, body_part, equipment")
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(30)

      const clean = query.trim().slice(0, 100).replace(/[,%]/g, "")
      if (clean) {
        dbQ = dbQ.or(`name.ilike.%${clean}%,target.ilike.%${clean}%`)
      }
      if (bp) dbQ = dbQ.eq("body_part", bp)

      const { data } = await dbQ
      setResults(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load: show popular exercises
  useEffect(() => {
    void search("", "")
  }, [search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    void search(q, bodyPart)
  }

  const handleBodyPart = (bp: string) => {
    const next = bodyPart === bp ? "" : bp
    setBodyPart(next)
    void search(q, next)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50 shrink-0">
          <h3 className="text-base font-semibold">Seleccionar ejercicio</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border/40 shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar ejercicio..."
                className="h-9 w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit" size="sm" variant="outline">Buscar</Button>
          </form>

          {/* Body part filters */}
          <div className="mt-2 flex flex-wrap gap-1">
            {KNOWN_BODY_PARTS.map((bp) => (
              <button
                key={bp}
                type="button"
                onClick={() => handleBodyPart(bp)}
                className={[
                  "rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  bodyPart === bp
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted",
                ].join(" ")}
              >
                {t(BODY_PART_ES, bp)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {searched ? "Sin resultados." : "Escribe para buscar."}
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {results.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(ex)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                      <Dumbbell className="h-3.5 w-3.5 text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{ex.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t(BODY_PART_ES, ex.body_part)} · {t(EQUIPMENT_ES, ex.equipment)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-primary mt-0.5">Agregar</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Exercise Config Row ───────────────────────────────────────────────────────

interface ExerciseRowProps {
  ex: PlanExercise
  isFirst: boolean
  isLast: boolean
  onChange: (updated: PlanExercise) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function ExerciseConfigRow({ ex, isFirst, isLast, onChange, onRemove, onMoveUp, onMoveDown }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false)

  const set = <K extends keyof PlanExercise>(key: K, val: PlanExercise[K]) =>
    onChange({ ...ex, [key]: val })

  const parsePositiveInt = (v: string): number | null => {
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background/60 overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Order buttons */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors"
            aria-label="Subir"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors"
            aria-label="Bajar"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Name + summary */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-medium leading-snug line-clamp-1">{ex.exerciseName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ex.sets} series ·{" "}
            {ex.durationSeconds
              ? `${ex.durationSeconds} s`
              : ex.repsMin !== null && ex.repsMax !== null && ex.repsMin !== ex.repsMax
              ? `${ex.repsMin}–${ex.repsMax} reps`
              : ex.repsMin !== null
              ? `${ex.repsMin} reps`
              : "—"}{" "}
            · {ex.restSeconds < 60 ? `${ex.restSeconds}s` : `${Math.round(ex.restSeconds / 60)}min`} desc.
          </p>
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Eliminar ejercicio"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t border-border/40 px-3 pb-3 pt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Series</span>
            <input
              type="number"
              min={1}
              max={20}
              value={ex.sets}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (v >= 1) set("sets", v)
              }}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Reps mín.</span>
            <input
              type="number"
              min={1}
              placeholder="—"
              value={ex.repsMin ?? ""}
              onChange={(e) => set("repsMin", parsePositiveInt(e.target.value))}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Reps máx.</span>
            <input
              type="number"
              min={1}
              placeholder="—"
              value={ex.repsMax ?? ""}
              onChange={(e) => set("repsMax", parsePositiveInt(e.target.value))}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Descanso (s)</span>
            <input
              type="number"
              min={0}
              step={15}
              value={ex.restSeconds}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (v >= 0) set("restSeconds", v)
              }}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">RIR</span>
            <input
              type="number"
              min={0}
              max={10}
              placeholder="—"
              value={ex.rir ?? ""}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                set("rir", Number.isFinite(v) && v >= 0 ? v : null)
              }}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="col-span-2 sm:col-span-3 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Notas</span>
            <input
              type="text"
              maxLength={200}
              placeholder="Opcional"
              value={ex.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
      )}
    </div>
  )
}

// ── Day Card ──────────────────────────────────────────────────────────────────

interface DayCardProps {
  day: PlanDay
  index: number
  isFirst: boolean
  isLast: boolean
  onChange: (updated: PlanDay) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddExercise: () => void
}

function DayCard({ day, index, isFirst, isLast, onChange, onRemove, onMoveUp, onMoveDown, onAddExercise }: DayCardProps) {
  const updateExercise = (i: number, updated: PlanExercise) => {
    const exercises = [...day.exercises]
    exercises[i] = updated
    onChange({ ...day, exercises })
  }

  const removeExercise = (i: number) => {
    onChange({ ...day, exercises: day.exercises.filter((_, j) => j !== i) })
  }

  const moveExercise = (i: number, dir: -1 | 1) => {
    const exercises = [...day.exercises]
    const target = i + dir
    if (target < 0 || target >= exercises.length) return
    ;[exercises[i], exercises[target]] = [exercises[target], exercises[i]]
    onChange({ ...day, exercises })
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </span>

        <input
          type="text"
          value={day.name}
          maxLength={60}
          placeholder={`Día ${index + 1}`}
          onChange={(e) => onChange({ ...day, name: e.target.value })}
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold placeholder:text-muted-foreground focus:outline-none"
        />

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors"
            aria-label="Subir día"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-25 transition-colors"
            aria-label="Bajar día"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar día"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-4 pb-3 pt-2 flex flex-col gap-2">
        {day.exercises.length === 0 ? (
          <p className="py-3 text-center text-xs text-muted-foreground">
            Sin ejercicios. Agrega uno.
          </p>
        ) : (
          day.exercises.map((ex, i) => (
            <ExerciseConfigRow
              key={ex.localId}
              ex={ex}
              isFirst={i === 0}
              isLast={i === day.exercises.length - 1}
              onChange={(updated) => updateExercise(i, updated)}
              onRemove={() => removeExercise(i)}
              onMoveUp={() => moveExercise(i, -1)}
              onMoveDown={() => moveExercise(i, 1)}
            />
          ))
        )}

        <button
          type="button"
          onClick={onAddExercise}
          className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 py-2.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar ejercicio
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NuevaPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPlanId = searchParams.get("from")

  const [planName, setPlanName]       = useState("")
  const [goal, setGoal]               = useState<Objetivo>("ganar_masa_muscular")
  const [experience, setExperience]   = useState<Experiencia>("intermedio")
  const [days, setDays]               = useState<PlanDay[]>([
    { localId: uid(), name: "Día 1", exercises: [] },
  ])
  const [saving, setSaving]           = useState(false)
  const [loadingFrom, setLoadingFrom] = useState(!!fromPlanId)
  const [error, setError]             = useState<string | null>(null)

  // Exercise selector state
  const [selectorDayId, setSelectorDayId] = useState<string | null>(null)

  // Pre-fill from existing plan if ?from= is provided
  useEffect(() => {
    if (!fromPlanId) return

    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("workout_plans")
          .select(`
            name, goal, experience,
            workout_plan_days (
              id, day_number, name, sort_order,
              workout_plan_exercises (
                id, exercise_id, sort_order,
                sets, reps_min, reps_max, duration_seconds,
                rest_seconds, rir, notes,
                exercises ( id, name, body_part, equipment )
              )
            )
          `)
          .eq("id", fromPlanId)
          .maybeSingle()

        if (data) {
          setPlanName(data.name ? `${data.name} (copia)` : "")
          setGoal(data.goal as Objetivo)
          setExperience(data.experience as Experiencia)

          type RawDays = Array<{
            id: string
            day_number: number
            name: string
            sort_order: number
            workout_plan_exercises: Array<{
              id: string
              exercise_id: string
              sort_order: number
              sets: number
              reps_min: number | null
              reps_max: number | null
              duration_seconds: number | null
              rest_seconds: number
              rir: number | null
              notes: string | null
              exercises: { id: string; name: string; body_part: string; equipment: string }
            }>
          }>

          const rawDays = (data as unknown as { workout_plan_days: RawDays }).workout_plan_days ?? []
          const loadedDays: PlanDay[] = rawDays
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((d) => ({
              localId: uid(),
              name: d.name,
              exercises: (d.workout_plan_exercises ?? [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((ex) => ({
                  localId: uid(),
                  exerciseId: ex.exercise_id,
                  exerciseName: (ex.exercises as unknown as { name: string })?.name ?? ex.exercise_id,
                  exerciseBodyPart: (ex.exercises as unknown as { body_part: string })?.body_part ?? "",
                  exerciseEquipment: (ex.exercises as unknown as { equipment: string })?.equipment ?? "",
                  sets: ex.sets,
                  repsMin: ex.reps_min,
                  repsMax: ex.reps_max,
                  durationSeconds: ex.duration_seconds,
                  restSeconds: ex.rest_seconds,
                  rir: ex.rir,
                  notes: ex.notes ?? "",
                })),
            }))

          if (loadedDays.length > 0) setDays(loadedDays)
        }
      } finally {
        setLoadingFrom(false)
      }
    }

    void load()
  }, [fromPlanId])

  const addDay = () => {
    setDays((prev) => [
      ...prev,
      { localId: uid(), name: `Día ${prev.length + 1}`, exercises: [] },
    ])
  }

  const removeDay = (i: number) => {
    setDays((prev) => prev.filter((_, j) => j !== i))
  }

  const moveDay = (i: number, dir: -1 | 1) => {
    setDays((prev) => {
      const next = [...prev]
      const target = i + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[i], next[target]] = [next[target], next[i]]
      return next
    })
  }

  const updateDay = (i: number, updated: PlanDay) => {
    setDays((prev) => {
      const next = [...prev]
      next[i] = updated
      return next
    })
  }

  const handleSelectExercise = (ex: ExerciseSummary) => {
    if (!selectorDayId) return
    setDays((prev) =>
      prev.map((day) =>
        day.localId === selectorDayId
          ? { ...day, exercises: [...day.exercises, defaultExercise(ex)] }
          : day,
      ),
    )
    setSelectorDayId(null)
  }

  const handleSave = async () => {
    setError(null)

    // Validate
    if (!planName.trim()) {
      setError("El nombre del plan es obligatorio")
      return
    }
    if (days.length === 0) {
      setError("Agrega al menos un día")
      return
    }
    for (const day of days) {
      if (!day.name.trim()) {
        setError("Todos los días deben tener nombre")
        return
      }
      if (day.exercises.length === 0) {
        setError(`El día "${day.name}" no tiene ejercicios`)
        return
      }
    }

    setSaving(true)
    try {
      const body = {
        name: planName.trim(),
        goal,
        experience,
        days: days.map((day) => ({
          name: day.name.trim(),
          exercises: day.exercises.map((ex) => ({
            exercise_id: ex.exerciseId,
            sets: ex.sets,
            reps_min: ex.repsMin,
            reps_max: ex.repsMax,
            duration_seconds: ex.durationSeconds,
            rest_seconds: ex.restSeconds,
            rir: ex.rir,
            notes: ex.notes || null,
          })),
        })),
      }

      const res = await fetch("/api/workout/plans/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = (await res.json()) as { planId?: string; error?: string }

      if (!res.ok || json.error) {
        setError(json.error ?? "Error guardando el plan")
        return
      }

      router.push("/dashboard/rutina")
    } catch {
      setError("Error de red. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  if (loadingFrom) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-10">
        <PageHeader
          title={fromPlanId ? "Editar rutina" : "Nueva rutina manual"}
          backHref="/dashboard/rutina"
          backLabel="Mi plan"
        />

        {/* Plan metadata */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Información del plan
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="plan-name">
              Nombre de la rutina <span className="text-destructive">*</span>
            </label>
            <input
              id="plan-name"
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder='Ej. "Push Pull Legs", "Full Body", "Mi rutina"'
              maxLength={100}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="goal">
                Objetivo
              </label>
              <select
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value as Objetivo)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {GOAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="experience">
                Nivel
              </label>
              <select
                id="experience"
                value={experience}
                onChange={(e) => setExperience(e.target.value as Experiencia)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {EXPERIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Días de entrenamiento
            </p>
            <span className="text-xs text-muted-foreground">{days.length} / 7</span>
          </div>

          {days.map((day, i) => (
            <DayCard
              key={day.localId}
              day={day}
              index={i}
              isFirst={i === 0}
              isLast={i === days.length - 1}
              onChange={(updated) => updateDay(i, updated)}
              onRemove={() => removeDay(i)}
              onMoveUp={() => moveDay(i, -1)}
              onMoveDown={() => moveDay(i, 1)}
              onAddExercise={() => setSelectorDayId(day.localId)}
            />
          ))}

          {days.length < 7 && (
            <button
              type="button"
              onClick={addDay}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Agregar día
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Save */}
        <Button
          size="lg"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            fromPlanId ? "Guardar cambios" : "Guardar rutina"
          )}
        </Button>

        {fromPlanId && (
          <p className="text-center text-xs text-muted-foreground">
            Se creará una nueva versión de tu rutina. El historial de sesiones anterior se conserva.
          </p>
        )}
      </div>

      {/* Exercise selector dialog */}
      {selectorDayId && (
        <ExerciseSelector
          onSelect={handleSelectExercise}
          onClose={() => setSelectorDayId(null)}
        />
      )}
    </>
  )
}
