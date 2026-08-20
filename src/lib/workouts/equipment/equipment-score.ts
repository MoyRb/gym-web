/**
 * Equipment Scoring Engine — Training Context & Equipment Engine V1
 *
 * Produces a deterministic score for each exercise given a training context.
 * Higher score = more preferred in the candidate pool for that context.
 *
 * GYM:  soft ranking (bodyweight allowed but deprioritized vs machines/cables)
 * HOME: hard filter (incompatible equipment → excluded), then neutral score
 * HYBRID: gin scores + bodyweight boost
 * null/undefined context: legacy behavior (neutral, no preference)
 *
 * Pure functions — no DB access, no side effects.
 */

import type { TrainingEnvironment, EquipmentCategory, HomeEquipment } from "./equipment-categories"
import {
  HOME_EQUIPMENT_TO_RAW,
  BENCH_DEPENDENT_PATTERNS,
  PULLUP_BAR_PATTERNS,
  WEIGHTED_RAW,
} from "./equipment-categories"
import { normalizeEquipment } from "./normalize-equipment"

// ── Selection Context ─────────────────────────────────────────────────────────

/** Context driving equipment-aware candidate scoring and filtering. */
export interface SelectionContext {
  environment: TrainingEnvironment
  /**
   * Equipment the user has at home.
   * null = gym (no home checklist; gym has access to all equipment).
   */
  availableEquipment: HomeEquipment[] | null
  experience: string  // "principiante" | "intermedio" | "avanzado"
  goal: string        // "ganar_masa_muscular" | "bajar_grasa" | ...
}

// ── GYM Base Scores ───────────────────────────────────────────────────────────
// Scale: 0–100. Higher = preferred in gym candidate pool.
// Designed for ganar_masa_muscular / intermedio baseline;
// experience and goal modifiers adjust from here.

const GYM_BASE: Record<EquipmentCategory, number> = {
  machine:     85,
  cable:       85,
  free_weight: 80,
  smith:       75,
  assisted:    70,
  functional:  55,   // kettlebell etc. — valid in many gyms
  bodyweight:  35,   // available but not dominant (pull-ups/dips are exceptions)
  band:        20,
  cardio:      40,
  other:       45,
}

// ── Experience Modifiers (additive) ───────────────────────────────────────────

const GYM_EXPERIENCE_MOD: Record<string, Partial<Record<EquipmentCategory, number>>> = {
  /**
   * Beginners benefit from stable resistance and guided movement.
   * Machines and cables are safer for learning form.
   * Heavy free weight / barbell is deprioritized (not excluded).
   */
  principiante: {
    machine:     +15,
    assisted:    +15,
    cable:       +5,
    smith:       +10,
    free_weight: -10,
    bodyweight:  0,
  },
  intermedio: {},  // base scores apply — no additional modifier
  /**
   * Advanced trainees benefit from compound free weights and
   * weighted bodyweight movements (weighted dips, pull-ups, ring work).
   */
  avanzado: {
    free_weight: +10,
    bodyweight:  +15,
    machine:     -5,
  },
}

// ── Goal Modifiers (additive, applied after experience) ────────────────────────

const GYM_GOAL_MOD: Record<string, Partial<Record<EquipmentCategory, number>>> = {
  ganar_masa_muscular:      {},  // gym base is designed for this — no additional mod
  bajar_grasa: {
    bodyweight: +10,
    functional: +10,
    cardio:     +15,
  },
  mejorar_resistencia: {
    bodyweight: +15,
    cardio:     +25,
    functional: +15,
    band:       +10,
  },
  mejorar_condicion_general: {
    bodyweight: +5,
    functional: +5,
    cardio:     +10,
  },
}

// ── HYBRID Modifiers ──────────────────────────────────────────────────────────
// Applied on top of gym scores; gives home-friendly equipment a slight boost.

const HYBRID_MOD: Partial<Record<EquipmentCategory, number>> = {
  bodyweight: +10,
  band:       +10,
  functional: +5,
}

// ── Internal score computation ─────────────────────────────────────────────────

function computeGymScore(
  category: EquipmentCategory,
  experience: string,
  goal: string,
): number {
  const base = GYM_BASE[category] ?? 45
  const expMod = (GYM_EXPERIENCE_MOD[experience] ?? {})[category] ?? 0
  const goalMod = (GYM_GOAL_MOD[goal] ?? {})[category] ?? 0
  return Math.max(0, Math.min(100, base + expMod + goalMod))
}

// ── Home Compatibility ─────────────────────────────────────────────────────────

/**
 * Sentinel return value: exercise is incompatible with home equipment and must
 * be excluded from the candidate pool entirely.
 */
export const HOME_EXCLUDE_SCORE = -9999

/**
 * Returns true if an exercise is compatible with the user's home equipment.
 *
 * Rules:
 * 1. The exercise's raw equipment must be in the set allowed by availableEquipment.
 * 2. "weighted" (raw) requires bodyweight + (dumbbell or barbell).
 * 3. Bench-dependent names require "bench" in availableEquipment.
 * 4. Pull-up-dependent names require "pullup_bar" in availableEquipment.
 */
export function isCompatibleWithHomeEquipment(
  rawEquipment: string,
  exerciseName: string,
  availableEquipment: HomeEquipment[],
): boolean {
  const available = new Set(availableEquipment)
  const nameLow = exerciseName.toLowerCase()
  const rawLow = rawEquipment.trim().toLowerCase()

  // Build set of allowed raw equipment strings from user's selection
  const allowedRaw = new Set<string>()
  for (const eq of availableEquipment) {
    for (const raw of HOME_EQUIPMENT_TO_RAW[eq]) {
      allowedRaw.add(raw)
    }
  }

  // "weighted" requires bodyweight + at least one weight source
  if (rawLow === WEIGHTED_RAW) {
    return available.has("bodyweight") && (available.has("dumbbell") || available.has("barbell"))
  }

  // Exercise's raw equipment not in allowed list → incompatible
  if (!allowedRaw.has(rawLow)) return false

  // Secondary dependency: flat/incline/decline bench
  if (!available.has("bench")) {
    const needsBench = BENCH_DEPENDENT_PATTERNS.some((p) => nameLow.includes(p))
    if (needsBench) return false
  }

  // Secondary dependency: pull-up / overhead bar
  if (!available.has("pullup_bar")) {
    const needsBar = PULLUP_BAR_PATTERNS.some((p) => nameLow.includes(p))
    if (needsBar) return false
  }

  return true
}

// ── Main Scorer ────────────────────────────────────────────────────────────────

/**
 * Returns the equipment preference score for an exercise in the given context.
 *
 * - GYM:    0–100 based on equipment category, experience, and goal
 * - HOME:   HOME_EXCLUDE_SCORE if incompatible; 50 (neutral) if compatible
 * - HYBRID: GYM score + bodyweight/band/functional boost
 *
 * @param rawEquipment  - exercises.equipment raw string
 * @param exerciseName  - exercises.name (for secondary dependency inference)
 * @param context       - Training context
 */
export function scoreExerciseForContext(
  rawEquipment: string,
  exerciseName: string,
  context: SelectionContext,
): number {
  const category = normalizeEquipment(rawEquipment)
  const { environment, availableEquipment, experience, goal } = context

  switch (environment) {
    case "home": {
      const equipment = availableEquipment ?? ["bodyweight"]
      if (!isCompatibleWithHomeEquipment(rawEquipment, exerciseName, equipment)) {
        return HOME_EXCLUDE_SCORE
      }
      // All compatible home exercises share the same base score;
      // body_part priority ordering handles relevance within them.
      return 50
    }

    case "gym":
      return computeGymScore(category, experience, goal)

    case "hybrid": {
      const base = computeGymScore(category, experience, goal)
      const hybridBoost = HYBRID_MOD[category] ?? 0
      return Math.max(0, Math.min(100, base + hybridBoost))
    }

    default:
      return 50  // unknown environment → neutral (no preference)
  }
}

// ── Bodyweight Balance Guard ───────────────────────────────────────────────────

/**
 * Guardrail threshold: for GYM environment, if the bodyweight fraction of
 * selected exercises exceeds this, the plan is considered imbalanced.
 *
 * V1 reference: 30% for muscle_gain / intermediate / gym.
 * Treated as a configurable guardrail, not a physiological rule.
 * Exceptions: abs/core days, conditioning goals, limited catalog coverage.
 */
export const BODYWEIGHT_GYM_THRESHOLD_PCT = 0.30

export interface BodyweightBalanceResult {
  bodyweightCount: number
  totalCount: number
  ratio: number
  /** true when ratio exceeds BODYWEIGHT_GYM_THRESHOLD_PCT for GYM environment */
  isImbalanced: boolean
}

/**
 * Checks whether selected exercises are bodyweight-dominant for a gym session.
 * Meaningful only for GYM environment.
 *
 * @param selectedEquipments - Raw equipment strings of the selected exercises
 * @param environment        - Training environment
 */
export function checkBodyweightBalance(
  selectedEquipments: string[],
  environment: TrainingEnvironment,
): BodyweightBalanceResult {
  const total = selectedEquipments.length
  if (total === 0 || environment !== "gym") {
    return { bodyweightCount: 0, totalCount: total, ratio: 0, isImbalanced: false }
  }

  const bwCount = selectedEquipments.filter(
    (raw) => normalizeEquipment(raw) === "bodyweight",
  ).length

  const ratio = bwCount / total
  return {
    bodyweightCount: bwCount,
    totalCount: total,
    ratio,
    isImbalanced: ratio > BODYWEIGHT_GYM_THRESHOLD_PCT,
  }
}
