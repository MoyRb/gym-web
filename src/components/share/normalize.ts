import type { WorkoutSessionWithExercises } from "@/types/database"
import type { WorkoutShareData } from "./types"

/**
 * Minimal set-state interface needed by the normalizer.
 * Compatible with the page's local SetState (structural subtype).
 */
export interface ShareSetState {
  weight_kg: string
  reps: string
  completed: boolean
}

/**
 * Transforms a live workout session + local set states into the
 * flat WorkoutShareData model used by the share card.
 *
 * No PII (name, email, weight, age) is included.
 */
export function normalizeWorkoutShareData<S extends ShareSetState>(
  session: WorkoutSessionWithExercises,
  setStates: Map<string, S>,
): WorkoutShareData {
  const allSets = session.exercises.flatMap((e) => e.sets)

  const completedSets = allSets.filter(
    (s) => setStates.get(s.id)?.completed ?? s.completed,
  )

  const totalReps = completedSets.reduce((acc, s) => {
    const state = setStates.get(s.id)
    const reps = state?.reps ? parseInt(state.reps, 10) : (s.reps ?? 0)
    return acc + (Number.isNaN(reps) ? 0 : reps)
  }, 0)

  const totalVolumeKg = completedSets.reduce((acc, s) => {
    const state = setStates.get(s.id)
    const kg   = state?.weight_kg ? parseFloat(state.weight_kg) : (s.weight_kg ?? 0)
    const reps = state?.reps      ? parseInt(state.reps, 10)    : (s.reps      ?? 0)
    if (!Number.isNaN(kg) && !Number.isNaN(reps) && kg > 0 && reps > 0) {
      return acc + kg * reps
    }
    return acc
  }, 0)

  const bodyParts = session.exercises
    .map((e) => e.exercise?.body_part ?? null)
    .filter((p): p is string => typeof p === "string" && p.length > 0)

  return {
    workoutName:    deriveWorkoutName(bodyParts),
    date:           new Date(session.started_at),
    durationSeconds: session.duration_seconds ?? 0,
    completedSets:  completedSets.length,
    totalReps,
    totalVolumeKg,
    exerciseCount:  session.exercises.length,
  }
}

/**
 * Derives a human-readable workout name from the list of exercise body parts.
 * Uses common push/pull/legs classifications and falls back to the first body part.
 */
function deriveWorkoutName(bodyParts: string[]): string {
  if (bodyParts.length === 0) return "Entrenamiento"

  const lower = bodyParts.map((p) => p.toLowerCase())

  if (lower.some((p) => p.includes("chest"))) {
    return lower.some((p) =>
      p.includes("shoulder") || p.includes("tricep") || p.includes("arm"),
    )
      ? "Push Day"
      : "Pecho"
  }

  if (lower.some((p) => p.includes("back"))) {
    return lower.some((p) => p.includes("bicep") || p.includes("arm"))
      ? "Pull Day"
      : "Espalda"
  }

  if (
    lower.some((p) =>
      p.includes("leg") ||
      p.includes("quad") ||
      p.includes("hamstring") ||
      p.includes("glute") ||
      p.includes("calf"),
    )
  ) {
    return "Leg Day"
  }

  if (lower.some((p) => p.includes("shoulder"))) return "Hombros"
  if (lower.some((p) => p.includes("tricep"))) return "Tríceps"
  if (lower.some((p) => p.includes("bicep"))) return "Bíceps"
  if (lower.some((p) => p.includes("arm"))) return "Brazos"
  if (lower.some((p) => p.includes("cardio"))) return "Cardio"
  if (
    lower.some((p) =>
      p.includes("waist") || p.includes("core") || p.includes("abdom"),
    )
  ) {
    return "Core"
  }

  // Fall back to first unique body part, title-cased
  const first = bodyParts[0]
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}
