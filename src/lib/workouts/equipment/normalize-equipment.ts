/**
 * Equipment normalizer — raw dataset equipment string → EquipmentCategory.
 *
 * Single point of truth for this mapping.
 * Reusable for analytics, candidate scoring, and reporting.
 */

import type { EquipmentCategory } from "./equipment-categories"
import { RAW_TO_CATEGORY } from "./equipment-categories"

/**
 * Normalizes a raw exercise.equipment string to an EquipmentCategory.
 *
 * - Case-insensitive, whitespace-trimmed.
 * - Unknown strings map to "other" rather than throwing.
 *
 * @param raw - Raw equipment string from exercises.equipment (e.g. "body weight", "cable")
 */
export function normalizeEquipment(raw: string): EquipmentCategory {
  const key = raw.trim().toLowerCase()
  return RAW_TO_CATEGORY[key] ?? "other"
}
