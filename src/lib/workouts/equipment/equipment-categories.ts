/**
 * Equipment Categories — Training Context & Equipment Engine V1
 *
 * Types, constants, and raw→category mappings for the equipment scoring system.
 * Pure constants — no DB access, no side effects.
 */

// ── Core Types ─────────────────────────────────────────────────────────────────

export type TrainingEnvironment = "gym" | "home" | "hybrid"

export type EquipmentCategory =
  | "bodyweight"    // body weight
  | "free_weight"   // dumbbell, barbell, ez barbell, olympic barbell, trap bar, weighted
  | "cable"         // cable
  | "machine"       // leverage machine, sled machine
  | "smith"         // smith machine
  | "assisted"      // assisted
  | "band"          // band, resistance band
  | "functional"    // kettlebell, medicine ball, rope, stability ball, bosu ball, tire, hammer
  | "cardio"        // stationary bike, skierg machine, upper body ergometer, stepmill machine, elliptical machine
  | "other"         // roller, wheel roller, or unknown equipment strings

/**
 * Equipment options surfaced in the UI for home users.
 * Represents categories of physical equipment the user says they have.
 * NOT a 1:1 map to every raw dataset equipment string.
 */
export type HomeEquipment =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "bench"           // secondary: unlocks bench-dependent movements
  | "resistance_band"
  | "kettlebell"
  | "pullup_bar"      // secondary: unlocks pull-up/hanging movements

// ── Valid Value Lists (for server-side validation) ────────────────────────────

export const HOME_EQUIPMENT_VALUES: readonly HomeEquipment[] = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "bench",
  "resistance_band",
  "kettlebell",
  "pullup_bar",
]

export const TRAINING_ENVIRONMENT_VALUES: readonly TrainingEnvironment[] = ["gym", "home", "hybrid"]

// ── Raw → Category Mapping ────────────────────────────────────────────────────

/**
 * Maps raw exercise.equipment strings (lowercase) → EquipmentCategory.
 * Covers all 28+ known dataset equipment values.
 * Unknown strings fall through to "other" in normalizeEquipment().
 */
export const RAW_TO_CATEGORY: Readonly<Record<string, EquipmentCategory>> = {
  "body weight":              "bodyweight",
  "dumbbell":                 "free_weight",
  "barbell":                  "free_weight",
  "ez barbell":               "free_weight",
  "olympic barbell":          "free_weight",
  "trap bar":                 "free_weight",
  "weighted":                 "free_weight",   // weighted bodyweight (dips/pull-ups with added load)
  "cable":                    "cable",
  "leverage machine":         "machine",
  "sled machine":             "machine",
  "smith machine":            "smith",
  "assisted":                 "assisted",
  "band":                     "band",
  "resistance band":          "band",
  "kettlebell":               "functional",
  "medicine ball":            "functional",
  "rope":                     "functional",
  "stability ball":           "functional",
  "bosu ball":                "functional",
  "tire":                     "functional",
  "hammer":                   "functional",
  "roller":                   "other",
  "wheel roller":             "other",
  "stationary bike":          "cardio",
  "skierg machine":           "cardio",
  "upper body ergometer":     "cardio",
  "stepmill machine":         "cardio",
  "elliptical machine":       "cardio",
}

// ── Home Equipment → Allowed Raw Equipment ────────────────────────────────────

/**
 * Maps each HomeEquipment UI option to the raw dataset equipment strings it permits.
 *
 * Design decisions:
 * - "dumbbell" → only "dumbbell" (not barbell; user explicitly picks barbell separately)
 * - "barbell"  → "barbell" + "olympic barbell" (reasonable equivalence in home context)
 * - "bench"    → empty (secondary: enables bench-named movements, not a raw equipment type)
 * - "pullup_bar" → empty (secondary: enables pull-up/hanging movements)
 * - EZ bar and trap bar not mapped — niche equipment; listed as future items
 * - "weighted" (raw) needs bodyweight + (dumbbell or barbell); handled separately in scorer
 */
export const HOME_EQUIPMENT_TO_RAW: Readonly<Record<HomeEquipment, readonly string[]>> = {
  bodyweight:      ["body weight"],
  dumbbell:        ["dumbbell"],
  barbell:         ["barbell", "olympic barbell"],
  bench:           [],
  resistance_band: ["band", "resistance band"],
  kettlebell:      ["kettlebell"],
  pullup_bar:      [],
}

// ── Secondary Dependency Patterns ────────────────────────────────────────────

/**
 * Exercise name substrings indicating a flat/incline/decline bench is needed.
 * Checked lowercase via .includes().
 * Used for home filtering when "bench" is not in availableEquipment.
 *
 * Conservative V1 list — prefer false negatives (including a bench-needed exercise)
 * over false positives (excluding a valid floor movement).
 */
export const BENCH_DEPENDENT_PATTERNS: readonly string[] = [
  "bench press",
  "incline",
  "decline",
  " on bench",
  "on a bench",
]

/**
 * Exercise name substrings indicating an overhead bar / pull-up bar is needed.
 * Checked lowercase via .includes().
 */
export const PULLUP_BAR_PATTERNS: readonly string[] = [
  "pull-up",
  "pull up",
  "chin-up",
  "chin up",
  "hanging",
  "dead hang",
  "bar hang",
  "toes to bar",
]

/** Raw equipment string for weighted bodyweight exercises */
export const WEIGHTED_RAW = "weighted"
