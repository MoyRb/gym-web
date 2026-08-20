/**
 * Session Highlight detection.
 *
 * Deterministic — no AI, no random. Results are reproducible for the same inputs.
 * Only claims "PR" or "improvement" when comparison against real history is verified.
 *
 * V1 scope:
 * - Session-local highlights always available (featured_exercise, sets, duration, session_completed)
 * - History-based highlights (weight_improvement, reps_improvement, personal_record)
 *   require callers to supply ExerciseHistory — not fetched inside this module.
 */

import type { WorkoutSessionWithExercises } from "@/types/database"
import type { ShareSetState } from "./normalize"
import type { ShareHighlight, ShareHighlightType, WorkoutShareData } from "./types"

// ── History entry ─────────────────────────────────────────────────────────────

/**
 * Historical best performance for a single exercise from previous completed sessions.
 * Supplied by the caller (fetched separately from the DB).
 */
export interface ExerciseHistory {
  exerciseId:       string
  prevBestWeightKg: number | null
  prevBestReps:     number | null
  /**
   * Number of distinct previous sessions that contain this exercise.
   * Used to distinguish "personal record" (≥ 2 sessions) from "first improvement".
   */
  sessionCount: number
}

// ── Internal exercise summary ─────────────────────────────────────────────────

interface ExerciseSummary {
  exerciseId:    string
  exerciseName:  string
  completedSets: number
  bestWeightKg:  number | null
  bestReps:      number | null
  totalVolume:   number
}

// ── Priority order ────────────────────────────────────────────────────────────

const PRIORITY: ShareHighlightType[] = [
  "personal_record",
  "weight_improvement",
  "reps_improvement",
  "featured_exercise",
  "sets",
  "duration",
  "session_completed",
]

// ── Internal helpers ──────────────────────────────────────────────────────────

function make(
  type:     ShareHighlightType,
  label:    string,
  headline: string,
  subline?: string,
): ShareHighlight {
  return { type, label, headline, subline }
}

function buildExerciseSummaries(
  session:   WorkoutSessionWithExercises,
  setStates: Map<string, ShareSetState>,
): ExerciseSummary[] {
  return session.exercises.map((ex) => {
    const completedSets = ex.sets.filter(
      (s) => setStates.get(s.id)?.completed ?? s.completed,
    )

    let bestWeightKg: number | null = null
    let bestReps:     number | null = null
    let totalVolume   = 0

    for (const s of completedSets) {
      const state = setStates.get(s.id)
      const kg    = state?.weight_kg ? parseFloat(state.weight_kg) : (s.weight_kg  ?? null)
      const reps  = state?.reps      ? parseInt(state.reps, 10)    : (s.reps       ?? null)

      if (kg   !== null && !Number.isNaN(kg))   { if (bestWeightKg === null || kg   > bestWeightKg) bestWeightKg = kg   }
      if (reps  !== null && !Number.isNaN(reps)) { if (bestReps     === null || reps > bestReps)     bestReps     = reps }
      if (kg !== null && reps !== null && !Number.isNaN(kg) && !Number.isNaN(reps) && kg > 0) {
        totalVolume += kg * reps
      }
    }

    return {
      exerciseId:    ex.exercise_id,
      exerciseName:  ex.exercise?.name ?? "Ejercicio",
      completedSets: completedSets.length,
      bestWeightKg,
      bestReps,
      totalVolume,
    }
  })
}

/** Picks the "featured" exercise by most completed sets, then highest volume. */
function pickFeaturedExercise(summaries: ExerciseSummary[]): ExerciseSummary | null {
  const active = summaries.filter((s) => s.completedSets > 0)
  if (active.length === 0) return null
  return active.reduce((best, cur) => {
    if (cur.completedSets > best.completedSets)   return cur
    if (cur.completedSets === best.completedSets &&
        cur.totalVolume   > best.totalVolume)      return cur
    return best
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detects all available highlights for a session.
 * Returns highlights sorted by priority (best first).
 *
 * @param history - Optional: historical bests per exercise_id.
 *   When provided, enables improvement and PR detection.
 *   Without it, only session-local highlights are returned.
 *   The caller is responsible for fetching history from the DB.
 */
export function detectHighlights(
  session:   WorkoutSessionWithExercises,
  setStates: Map<string, ShareSetState>,
  data:      WorkoutShareData,
  history?:  Map<string, ExerciseHistory>,
): ShareHighlight[] {
  const summaries    = buildExerciseSummaries(session, setStates)
  const totalSets    = summaries.reduce((acc, s) => acc + s.completedSets, 0)
  const durationMins = data.durationSeconds > 0
    ? Math.max(1, Math.round(data.durationSeconds / 60))
    : 0

  const found: ShareHighlight[] = []
  const exercisesWithImprovement = new Set<string>()

  // ── History-based (only when history is supplied and verified) ─────────────
  if (history && history.size > 0) {
    for (const ex of summaries) {
      const hist = history.get(ex.exerciseId)
      if (!hist || hist.sessionCount < 1) continue

      // Weight improvement
      if (
        ex.bestWeightKg !== null &&
        hist.prevBestWeightKg !== null &&
        ex.bestWeightKg > hist.prevBestWeightKg
      ) {
        const delta = Math.round((ex.bestWeightKg - hist.prevBestWeightKg) * 10) / 10
        exercisesWithImprovement.add(ex.exerciseId)

        if (hist.sessionCount >= 2) {
          // At least 2 prior sessions → confident it's a true PR
          found.push(make("personal_record", "NUEVO RÉCORD PERSONAL", `+${delta} KG`, ex.exerciseName.toUpperCase()))
        } else {
          found.push(make("weight_improvement", "LOGRO DEL DÍA", `+${delta} KG`, ex.exerciseName.toUpperCase()))
        }
        continue // don't add reps highlight for the same exercise
      }

      // Reps improvement
      if (
        ex.bestReps !== null &&
        hist.prevBestReps !== null &&
        ex.bestReps > hist.prevBestReps
      ) {
        const delta = ex.bestReps - hist.prevBestReps
        exercisesWithImprovement.add(ex.exerciseId)
        found.push(make("reps_improvement", "LOGRO DEL DÍA", `+${delta} REPS`, ex.exerciseName.toUpperCase()))
      }
    }
  }

  // ── Session-local highlights ───────────────────────────────────────────────

  // Featured exercise (prefer one with verified improvement; else most-sets)
  const featured = pickFeaturedExercise(summaries)
  if (featured) {
    found.push(make(
      "featured_exercise",
      "EJERCICIO DESTACADO",
      featured.exerciseName.toUpperCase(),
      featured.completedSets === 1 ? "1 SERIE" : `${featured.completedSets} SERIES`,
    ))
  }

  // Total sets
  if (totalSets >= 3) {
    found.push(make("sets", "LOGRO DEL DÍA", `${totalSets} SERIES`, data.workoutName.toUpperCase()))
  }

  // Duration
  if (durationMins >= 10) {
    found.push(make("duration", "SESIÓN COMPLETADA", `${durationMins} MIN`, data.workoutName.toUpperCase()))
  }

  // Session completed — always the ultimate fallback
  found.push(make("session_completed", "SESIÓN COMPLETADA", data.workoutName.toUpperCase()))

  // Sort by priority, deduplicate by type (keep first occurrence = best)
  const seen = new Set<ShareHighlightType>()
  return found
    .sort((a, b) => PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type))
    .filter((h) => {
      if (seen.has(h.type)) return false
      seen.add(h.type)
      return true
    })
}

/**
 * Returns the highest-priority highlight from the list.
 * Falls back to "session_completed" if the list is empty.
 */
export function selectAutoHighlight(highlights: ShareHighlight[]): ShareHighlight {
  return highlights[0] ?? make("session_completed", "SESIÓN COMPLETADA", "ENTRENAMIENTO")
}

/**
 * Human-readable label for a highlight type.
 * Used in the manual highlight selector UI.
 */
export function getHighlightLabel(type: ShareHighlightType): string {
  switch (type) {
    case "personal_record":    return "Récord personal"
    case "weight_improvement": return "Mejora de peso"
    case "reps_improvement":   return "Mejora de reps"
    case "featured_exercise":  return "Ejercicio destacado"
    case "sets":               return "Series completadas"
    case "duration":           return "Duración"
    case "session_completed":  return "Sesión completada"
  }
}
