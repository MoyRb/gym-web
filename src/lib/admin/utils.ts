/**
 * Pure utility functions for admin analytics computations.
 * All functions are deterministic and side-effect free — suitable for testing.
 */

/** Compute completion rate as a percentage (0–100), returns null on zero denominator. */
export function completionRate(completed: number, total: number): number | null {
  if (total === 0) return null
  return Math.round((completed / total) * 100)
}

/**
 * Compute growth percentage between current and previous period.
 * Returns null when previous period is 0 (no baseline for comparison).
 */
export function growthPct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: 3600 → "60 min", 90 → "1 min 30 s", 45 → "45 s"
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—"
  if (seconds < 60) return `${seconds} s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (secs === 0) return `${mins} min`
  return `${mins} min ${secs} s`
}

/**
 * Format a goal key to a display label (Spanish).
 */
export function formatGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    ganar_masa_muscular:    "Ganar masa muscular",
    bajar_grasa:            "Bajar grasa",
    mejorar_resistencia:    "Mejorar resistencia",
    mejorar_condicion_general: "Condición general",
  }
  return labels[goal] ?? goal
}

/**
 * Format an experience key to a display label (Spanish).
 */
export function formatExperienceLabel(experience: string): string {
  const labels: Record<string, string> = {
    principiante: "Principiante",
    intermedio:   "Intermedio",
    avanzado:     "Avanzado",
  }
  return labels[experience] ?? experience
}

/**
 * Format a sex value to display label (Spanish).
 */
export function formatSexLabel(sex: string): string {
  const labels: Record<string, string> = {
    male:   "Masculino",
    female: "Femenino",
    other:  "Otro",
    M:      "Masculino",
    F:      "Femenino",
  }
  return labels[sex] ?? sex
}

/**
 * Safe percentage relative to a maximum value for bar chart widths.
 * Returns a value 0–100.
 */
export function barWidth(value: number, max: number): number {
  if (max === 0) return 0
  return Math.min(100, Math.round((value / max) * 100))
}

/**
 * Format a large number with thousands separator.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("es-ES")
}

/**
 * Format a growth percentage with sign and color hint.
 */
export function formatGrowth(pct: number | null): { text: string; positive: boolean | null } {
  if (pct === null) return { text: "n/d", positive: null }
  if (pct === 0)    return { text: "0%",  positive: null }
  return {
    text: `${pct > 0 ? "+" : ""}${pct}%`,
    positive: pct > 0,
  }
}
