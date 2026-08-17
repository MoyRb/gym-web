/**
 * Workout Split Builder
 *
 * Deterministic weekly structure generator.
 * Given days_per_week and goal, returns a structured split
 * defining each training day's name and muscle focus.
 *
 * Pure function — no DB access, no side effects.
 * Same inputs always produce the same output.
 */

export interface SplitDay {
  day_number: number
  /** Day label shown in the UI and sent to AI as the pre-assigned name */
  name: string
  /** Body parts to prioritize for candidate selection for this specific day */
  focus: string[]
}

export type WorkoutSplit = SplitDay[]

// ── Focus Groups ──────────────────────────────────────────────────────────────

const FULL_BODY_FOCUS = ["chest", "back", "upper legs", "shoulders", "upper arms", "waist"]
const UPPER_FOCUS     = ["chest", "back", "shoulders", "upper arms", "lower arms"]
const LOWER_FOCUS     = ["upper legs", "lower legs", "waist"]
const PUSH_FOCUS      = ["chest", "shoulders", "upper arms"]
const PULL_FOCUS      = ["back", "upper arms", "lower arms"]
const LEGS_FOCUS      = ["upper legs", "lower legs", "waist"]
const CARDIO_FOCUS    = ["cardio", "upper legs", "waist"]
const CORE_FOCUS      = ["waist", "back"]

// ── Split Templates ───────────────────────────────────────────────────────────

type DayTemplate = Omit<SplitDay, "day_number">

const HYPERTROPHY_SPLITS: Readonly<Record<number, DayTemplate[]>> = {
  2: [
    { name: "Full Body", focus: FULL_BODY_FOCUS },
    { name: "Full Body", focus: FULL_BODY_FOCUS },
  ],
  3: [
    { name: "Push", focus: PUSH_FOCUS },
    { name: "Pull", focus: PULL_FOCUS },
    { name: "Legs", focus: LEGS_FOCUS },
  ],
  4: [
    { name: "Upper", focus: UPPER_FOCUS },
    { name: "Lower", focus: LOWER_FOCUS },
    { name: "Upper", focus: UPPER_FOCUS },
    { name: "Lower", focus: LOWER_FOCUS },
  ],
  5: [
    { name: "Push",  focus: PUSH_FOCUS },
    { name: "Pull",  focus: PULL_FOCUS },
    { name: "Legs",  focus: LEGS_FOCUS },
    { name: "Upper", focus: UPPER_FOCUS },
    { name: "Lower", focus: LOWER_FOCUS },
  ],
  6: [
    { name: "Push", focus: PUSH_FOCUS },
    { name: "Pull", focus: PULL_FOCUS },
    { name: "Legs", focus: LEGS_FOCUS },
    { name: "Push", focus: PUSH_FOCUS },
    { name: "Pull", focus: PULL_FOCUS },
    { name: "Legs", focus: LEGS_FOCUS },
  ],
  7: [
    { name: "Push",  focus: PUSH_FOCUS },
    { name: "Pull",  focus: PULL_FOCUS },
    { name: "Legs",  focus: LEGS_FOCUS },
    { name: "Upper", focus: UPPER_FOCUS },
    { name: "Lower", focus: LOWER_FOCUS },
    { name: "Push",  focus: PUSH_FOCUS },
    { name: "Pull",  focus: PULL_FOCUS },
  ],
}

const FAT_LOSS_SPLITS: Readonly<Record<number, DayTemplate[]>> = {
  2: [
    { name: "Full Body", focus: FULL_BODY_FOCUS },
    { name: "Full Body", focus: FULL_BODY_FOCUS },
  ],
  3: [
    { name: "Full Body", focus: FULL_BODY_FOCUS },
    { name: "Full Body", focus: [...FULL_BODY_FOCUS, "cardio"] },
    { name: "Full Body", focus: FULL_BODY_FOCUS },
  ],
  4: [
    { name: "Upper", focus: UPPER_FOCUS },
    { name: "Lower", focus: [...LOWER_FOCUS, "cardio"] },
    { name: "Upper", focus: UPPER_FOCUS },
    { name: "Lower", focus: [...LOWER_FOCUS, "cardio"] },
  ],
  5: [
    { name: "Upper",     focus: UPPER_FOCUS },
    { name: "Lower",     focus: LOWER_FOCUS },
    { name: "Full Body", focus: [...FULL_BODY_FOCUS, "cardio"] },
    { name: "Upper",     focus: UPPER_FOCUS },
    { name: "Lower",     focus: [...LOWER_FOCUS, "cardio"] },
  ],
  6: [
    { name: "Upper",     focus: UPPER_FOCUS },
    { name: "Lower",     focus: LOWER_FOCUS },
    { name: "Cardio",    focus: CARDIO_FOCUS },
    { name: "Upper",     focus: UPPER_FOCUS },
    { name: "Lower",     focus: [...LOWER_FOCUS, "cardio"] },
    { name: "Full Body", focus: FULL_BODY_FOCUS },
  ],
  7: [
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: LOWER_FOCUS },
    { name: "Cardio", focus: CARDIO_FOCUS },
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: LOWER_FOCUS },
    { name: "Cardio", focus: CARDIO_FOCUS },
    { name: "Core",   focus: CORE_FOCUS },
  ],
}

const ENDURANCE_SPLITS: Readonly<Record<number, DayTemplate[]>> = {
  2: [
    { name: "Full Body", focus: [...FULL_BODY_FOCUS, "cardio"] },
    { name: "Full Body", focus: [...FULL_BODY_FOCUS, "cardio"] },
  ],
  3: [
    { name: "Upper",     focus: UPPER_FOCUS },
    { name: "Lower",     focus: [...LOWER_FOCUS, "cardio"] },
    { name: "Full Body", focus: [...FULL_BODY_FOCUS, "cardio"] },
  ],
  4: [
    { name: "Upper",     focus: UPPER_FOCUS },
    { name: "Lower",     focus: LOWER_FOCUS },
    { name: "Cardio",    focus: CARDIO_FOCUS },
    { name: "Full Body", focus: FULL_BODY_FOCUS },
  ],
  5: [
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: LOWER_FOCUS },
    { name: "Cardio", focus: CARDIO_FOCUS },
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: [...LOWER_FOCUS, "cardio"] },
  ],
  6: [
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: LOWER_FOCUS },
    { name: "Cardio", focus: CARDIO_FOCUS },
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: LOWER_FOCUS },
    { name: "Cardio", focus: CARDIO_FOCUS },
  ],
  7: [
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: LOWER_FOCUS },
    { name: "Cardio", focus: CARDIO_FOCUS },
    { name: "Upper",  focus: UPPER_FOCUS },
    { name: "Lower",  focus: LOWER_FOCUS },
    { name: "Cardio", focus: CARDIO_FOCUS },
    { name: "Core",   focus: CORE_FOCUS },
  ],
}

// mejorar_condicion_general uses the hypertrophy split structure
const GENERAL_SPLITS = HYPERTROPHY_SPLITS

function getSplitTemplates(goal: string): Readonly<Record<number, DayTemplate[]>> {
  switch (goal) {
    case "ganar_masa_muscular":    return HYPERTROPHY_SPLITS
    case "bajar_grasa":            return FAT_LOSS_SPLITS
    case "mejorar_resistencia":    return ENDURANCE_SPLITS
    case "mejorar_condicion_general": return GENERAL_SPLITS
    default:                       return HYPERTROPHY_SPLITS
  }
}

/**
 * Builds a deterministic weekly training split.
 * Same daysPerWeek + goal always returns the identical split array.
 *
 * @param daysPerWeek - Number of training days (1–7)
 * @param goal        - User fitness goal string
 * @returns Ordered array of SplitDay, one per training day
 */
export function buildWorkoutSplit(daysPerWeek: number, goal: string): WorkoutSplit {
  const templates = getSplitTemplates(goal)
  const dayTemplates = templates[daysPerWeek]

  if (dayTemplates) {
    return dayTemplates.map((t, i) => ({
      day_number: i + 1,
      name: t.name,
      focus: t.focus,
    }))
  }

  // Fallback for unusual values: N full-body days
  return Array.from({ length: daysPerWeek }, (_, i) => ({
    day_number: i + 1,
    name: "Full Body",
    focus: FULL_BODY_FOCUS,
  }))
}

/**
 * Divides a workout split into batches of at most 2 days each.
 * Deterministic: same split always produces the same batches in the same order.
 *
 * Examples:
 *   3 days → [[day1, day2], [day3]]        (2 batches)
 *   4 days → [[day1, day2], [day3, day4]]  (2 batches)
 *   5 days → [[day1, day2], [day3, day4], [day5]]  (3 batches)
 */
export function buildBatches(split: WorkoutSplit): WorkoutSplit[] {
  const batches: WorkoutSplit[] = []
  for (let i = 0; i < split.length; i += 2) {
    batches.push(split.slice(i, i + 2))
  }
  return batches
}
