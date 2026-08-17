/**
 * Deterministic Exercise Prescription Engine
 *
 * Given a selected exercise ID, its body_part, and the user's goal/experience,
 * produces a fully prescribed exercise with sets, reps/duration, rest, and RIR.
 *
 * Replaces the AI's role of outputting numeric prescription fields.
 * This guarantees valid, non-null values for all required fields.
 *
 * Pure functions — no DB access, no side effects.
 */

export interface PrescribedExercise {
  exercise_id: string
  sets: number
  reps_min: number | null
  reps_max: number | null
  duration_seconds: number | null
  rest_seconds: number
  rir: number | null
  notes: string | null
}

// ── Internal prescription tables ───────────────────────────────────────────────

interface RepPrescription {
  sets: number
  reps_min: number
  reps_max: number
  rest_seconds: number
  rir: number | null
}

interface DurationPrescription {
  sets: number
  duration_seconds: number
  rest_seconds: number
}

/** Rep-based prescription table: goal → experience → values */
const REP_TABLE: Readonly<Record<string, Readonly<Record<string, RepPrescription>>>> = {
  ganar_masa_muscular: {
    principiante: { sets: 3, reps_min: 8,  reps_max: 12, rest_seconds: 90,  rir: null },
    intermedio:   { sets: 4, reps_min: 6,  reps_max: 12, rest_seconds: 90,  rir: 2 },
    avanzado:     { sets: 4, reps_min: 5,  reps_max: 10, rest_seconds: 120, rir: 1 },
  },
  bajar_grasa: {
    principiante: { sets: 3, reps_min: 12, reps_max: 15, rest_seconds: 60,  rir: null },
    intermedio:   { sets: 3, reps_min: 12, reps_max: 15, rest_seconds: 60,  rir: 2 },
    avanzado:     { sets: 4, reps_min: 10, reps_max: 15, rest_seconds: 60,  rir: 1 },
  },
  mejorar_resistencia: {
    principiante: { sets: 2, reps_min: 15, reps_max: 20, rest_seconds: 45,  rir: null },
    intermedio:   { sets: 3, reps_min: 15, reps_max: 20, rest_seconds: 45,  rir: 2 },
    avanzado:     { sets: 3, reps_min: 15, reps_max: 20, rest_seconds: 45,  rir: 1 },
  },
  mejorar_condicion_general: {
    principiante: { sets: 3, reps_min: 10, reps_max: 15, rest_seconds: 60,  rir: null },
    intermedio:   { sets: 3, reps_min: 10, reps_max: 15, rest_seconds: 60,  rir: 2 },
    avanzado:     { sets: 4, reps_min: 8,  reps_max: 15, rest_seconds: 75,  rir: 1 },
  },
}

/** Duration-based (cardio) prescription table: goal → experience → values */
const DURATION_TABLE: Readonly<Record<string, Readonly<Record<string, DurationPrescription>>>> = {
  ganar_masa_muscular: {
    principiante: { sets: 3, duration_seconds: 30, rest_seconds: 60 },
    intermedio:   { sets: 3, duration_seconds: 30, rest_seconds: 60 },
    avanzado:     { sets: 3, duration_seconds: 45, rest_seconds: 60 },
  },
  bajar_grasa: {
    principiante: { sets: 3, duration_seconds: 45, rest_seconds: 45 },
    intermedio:   { sets: 3, duration_seconds: 45, rest_seconds: 45 },
    avanzado:     { sets: 4, duration_seconds: 60, rest_seconds: 30 },
  },
  mejorar_resistencia: {
    principiante: { sets: 3, duration_seconds: 45, rest_seconds: 30 },
    intermedio:   { sets: 4, duration_seconds: 60, rest_seconds: 30 },
    avanzado:     { sets: 4, duration_seconds: 60, rest_seconds: 30 },
  },
  mejorar_condicion_general: {
    principiante: { sets: 3, duration_seconds: 30, rest_seconds: 45 },
    intermedio:   { sets: 3, duration_seconds: 45, rest_seconds: 45 },
    avanzado:     { sets: 3, duration_seconds: 45, rest_seconds: 30 },
  },
}

const DEFAULT_REP: RepPrescription = { sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, rir: null }
const DEFAULT_DURATION: DurationPrescription = { sets: 3, duration_seconds: 30, rest_seconds: 60 }

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the exercise should use duration_seconds instead of reps.
 * Currently: exercises with body_part === "cardio" are duration-based.
 */
export function isDurationBased(exercise: { body_part: string }): boolean {
  return exercise.body_part.toLowerCase() === "cardio"
}

/**
 * Prescribes a single exercise with deterministic numeric parameters.
 * Never returns null for sets, rest_seconds, or the appropriate rep/duration fields.
 *
 * @param exerciseId   - UUID of the selected exercise
 * @param exercise     - Metadata with at minimum { body_part }
 * @param goal         - User fitness goal (e.g. "ganar_masa_muscular")
 * @param experience   - User experience level (e.g. "intermedio")
 */
export function prescribeExercise(
  exerciseId: string,
  exercise: { body_part: string },
  goal: string,
  experience: string,
): PrescribedExercise {
  if (isDurationBased(exercise)) {
    const p = DURATION_TABLE[goal]?.[experience] ?? DEFAULT_DURATION
    return {
      exercise_id: exerciseId,
      sets: p.sets,
      reps_min: null,
      reps_max: null,
      duration_seconds: p.duration_seconds,
      rest_seconds: p.rest_seconds,
      rir: null,
      notes: null,
    }
  }

  const p = REP_TABLE[goal]?.[experience] ?? DEFAULT_REP
  return {
    exercise_id: exerciseId,
    sets: p.sets,
    reps_min: p.reps_min,
    reps_max: p.reps_max,
    duration_seconds: null,
    rest_seconds: p.rest_seconds,
    rir: p.rir,
    notes: null,
  }
}

// ── Exercise count bounds ──────────────────────────────────────────────────────
//
// Primary driver: days_per_week (frequency).
// Higher frequency → more specialized days → fewer exercises each.
// Lower frequency → full-body sessions → more exercises needed.
//
// Experience modulates within the frequency band:
//   principiante → lower end  (avoid overwhelming beginners)
//   intermedio   → middle/upper
//   avanzado     → upper end
//
// Sets per exercise (from REP_TABLE/DURATION_TABLE) are NOT changed here —
// the prescription engine handles them independently. Together these produce
// coherent total volume: fewer exercises on high-frequency splits, more on low.

interface ExperienceBounds { min: number; max: number }
interface CountBounds {
  principiante: ExperienceBounds
  intermedio:   ExperienceBounds
  avanzado:     ExperienceBounds
}

const COUNT_BY_DAYS: Readonly<Record<number, CountBounds>> = {
  2: { principiante: { min: 5, max: 6 }, intermedio: { min: 6, max: 8 }, avanzado: { min: 6, max: 8 } },
  3: { principiante: { min: 4, max: 6 }, intermedio: { min: 5, max: 7 }, avanzado: { min: 5, max: 7 } },
  4: { principiante: { min: 4, max: 6 }, intermedio: { min: 5, max: 7 }, avanzado: { min: 5, max: 7 } },
  5: { principiante: { min: 4, max: 5 }, intermedio: { min: 4, max: 6 }, avanzado: { min: 5, max: 6 } },
  6: { principiante: { min: 3, max: 5 }, intermedio: { min: 4, max: 6 }, avanzado: { min: 4, max: 6 } },
  7: { principiante: { min: 3, max: 4 }, intermedio: { min: 3, max: 5 }, avanzado: { min: 4, max: 5 } },
}

// Fallback for edge cases (1 day or unusual values): use 3-day profile
const DEFAULT_COUNT: CountBounds = {
  principiante: { min: 4, max: 6 },
  intermedio:   { min: 5, max: 7 },
  avanzado:     { min: 5, max: 7 },
}

/**
 * Returns the backend-determined exercise count bounds per day.
 * These bounds are sent to the AI as a selection constraint and validated server-side.
 *
 * @param daysPerWeek - Training frequency (1–7); primary driver of volume per session.
 * @param experience  - User experience level; modulates within the frequency band.
 */
export function getExerciseCountBounds(
  daysPerWeek: number,
  experience: string,
): { min: number; max: number } {
  const byDays = COUNT_BY_DAYS[daysPerWeek] ?? DEFAULT_COUNT
  if (experience === "principiante") return byDays.principiante
  if (experience === "avanzado")     return byDays.avanzado
  return byDays.intermedio  // covers "intermedio" and any unknown value
}
