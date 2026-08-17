/**
 * Candidate Exercise Engine
 *
 * Deterministic selection of exercises from the catalog for AI input.
 * - Only active exercises are included.
 * - Exercises are grouped by body_part, sorted by name within each group.
 * - Groups are prioritized by fitness goal.
 * - Total candidates are capped at MAX_CANDIDATES.
 *
 * The algorithm is deterministic: same inputs always produce the same output.
 * server-only.
 */

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { CandidateExercise } from "@/lib/ai/types"

export type { CandidateExercise }

export const MAX_CANDIDATES = 55

/**
 * Slots allocated per body_part priority rank.
 * Index 0 = highest priority group, gets the most slots.
 * Sum exceeds MAX_CANDIDATES intentionally — the cap enforces the final limit.
 */
const SLOTS_PER_RANK: readonly number[] = [9, 8, 7, 6, 6, 5, 4, 4, 3, 3, 2, 2, 1]

/**
 * Body_part priority ordered by fitness goal.
 * First in list → most candidates allocated.
 */
const BODY_PART_PRIORITY: Readonly<Record<string, readonly string[]>> = {
  ganar_masa_muscular: [
    "back",
    "chest",
    "upper legs",
    "shoulders",
    "upper arms",
    "lower legs",
    "waist",
    "lower arms",
    "neck",
    "cardio",
  ],
  bajar_grasa: [
    "upper legs",
    "waist",
    "back",
    "chest",
    "cardio",
    "shoulders",
    "upper arms",
    "lower legs",
    "lower arms",
    "neck",
  ],
  mejorar_resistencia: [
    "upper legs",
    "back",
    "cardio",
    "chest",
    "waist",
    "shoulders",
    "lower legs",
    "upper arms",
    "lower arms",
    "neck",
  ],
  mejorar_condicion_general: [
    "upper legs",
    "back",
    "chest",
    "shoulders",
    "waist",
    "upper arms",
    "lower legs",
    "cardio",
    "lower arms",
    "neck",
  ],
}

const DEFAULT_PRIORITY: readonly string[] = [
  "upper legs",
  "back",
  "chest",
  "shoulders",
  "waist",
  "upper arms",
  "lower legs",
  "cardio",
  "lower arms",
  "neck",
]

type ExerciseRow = Pick<
  Database["public"]["Tables"]["exercises"]["Row"],
  "id" | "name" | "body_part" | "equipment" | "target" | "is_active"
>

/**
 * Selects a deterministic, capped set of candidate exercises for AI input.
 *
 * @param exercises - Exercise rows (from DB or test fixture)
 * @param goal - User fitness goal (maps to BODY_PART_PRIORITY)
 * @returns Candidate list, max MAX_CANDIDATES entries
 */
export function selectCandidates(exercises: ExerciseRow[], goal: string): CandidateExercise[] {
  const active = exercises.filter((e) => e.is_active)

  // Group by lowercase body_part (case-insensitive)
  const groups = new Map<string, ExerciseRow[]>()
  for (const ex of active) {
    const key = ex.body_part.toLowerCase()
    const arr = groups.get(key) ?? []
    arr.push(ex)
    groups.set(key, arr)
  }

  // Sort within each group by name for determinism
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, "en"))
  }

  const priority = BODY_PART_PRIORITY[goal] ?? DEFAULT_PRIORITY
  const result: CandidateExercise[] = []
  const usedBodyParts = new Set<string>()

  // First pass: priority-ordered groups
  for (let i = 0; i < priority.length; i++) {
    if (result.length >= MAX_CANDIDATES) break
    const bp = priority[i].toLowerCase()
    const group = groups.get(bp) ?? []
    const slots = Math.min(SLOTS_PER_RANK[i] ?? 2, MAX_CANDIDATES - result.length)
    for (const ex of group.slice(0, slots)) {
      result.push(toCandidate(ex))
    }
    usedBodyParts.add(bp)
  }

  // Second pass: any body_part not in priority list gets up to 2 slots
  if (result.length < MAX_CANDIDATES) {
    const otherBodyParts = [...groups.keys()]
      .filter((bp) => !usedBodyParts.has(bp))
      .sort()
    for (const bp of otherBodyParts) {
      if (result.length >= MAX_CANDIDATES) break
      const group = groups.get(bp) ?? []
      const slots = Math.min(2, MAX_CANDIDATES - result.length)
      for (const ex of group.slice(0, slots)) {
        result.push(toCandidate(ex))
      }
    }
  }

  return result
}

function toCandidate(ex: ExerciseRow): CandidateExercise {
  return {
    id: ex.id,
    name: ex.name,
    body_part: ex.body_part,
    equipment: ex.equipment,
    target: ex.target,
  }
}

/**
 * Fetches active exercises from the database and returns a curated candidate set.
 */
export async function getCandidateExercises(
  supabase: SupabaseClient<Database>,
  goal: string,
): Promise<CandidateExercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, body_part, equipment, target, is_active")
    .eq("is_active", true)

  if (error) {
    throw new Error(`Error cargando el catálogo de ejercicios: ${error.message}`)
  }

  return selectCandidates(data ?? [], goal)
}
