/**
 * Formatting utilities for the workout share card.
 * Pure functions — no side effects, no imports from other share files.
 */

// ── Duration ──────────────────────────────────────────────────────────────────

/**
 * Returns a short human-readable duration for the share card.
 * Examples:
 *   42 s        → "42 SEG"
 *   300 s       → "5 MIN"
 *   3661 s      → "1h 01min"
 */
export function formatShareDuration(seconds: number): string {
  if (seconds <= 0) return "0 MIN"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`
  if (m > 0) return `${m} MIN`
  return `${s} SEG`
}

// ── Volume ────────────────────────────────────────────────────────────────────

/**
 * Returns the hero volume number with thousands separator.
 * Returns null when volume is 0 or negative (use duration as hero instead).
 */
export function formatShareVolumeDisplay(kg: number): string | null {
  if (kg <= 0) return null
  const rounded = Math.round(kg)
  return rounded.toLocaleString("es-ES")
}

/**
 * Returns just the formatted number string (used inside the hero metric).
 * Guaranteed to return a non-empty string.
 */
export function formatShareVolumeNumber(kg: number): string {
  if (kg <= 0) return "0"
  return Math.round(kg).toLocaleString("es-ES")
}

// ── Date ──────────────────────────────────────────────────────────────────────

/**
 * Returns the date in locale-appropriate uppercase format for the card footer.
 * Example: "19 AGO 2026"
 */
export function formatShareDate(date: Date): string {
  try {
    return date
      .toLocaleDateString("es-ES", {
        day:   "numeric",
        month: "short",
        year:  "numeric",
      })
      .toUpperCase()
      .replace(".", "")  // Remove trailing dot from abbreviated months
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

// ── Export filename ───────────────────────────────────────────────────────────

/**
 * Returns a readable download filename.
 * Example: "alpha-trainer-workout-2026-08-19.png"
 */
export function getShareFilename(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `alpha-trainer-workout-${y}-${m}-${d}.png`
}

// ── Web Share API detection ───────────────────────────────────────────────────

/** Returns true if the Web Share API is available in this browser. */
export function isWebShareSupported(): boolean {
  if (typeof navigator === "undefined") return false
  return "share" in navigator
}

/**
 * Returns true if the browser supports sharing files via the Web Share API.
 * This is the capability needed to share a PNG directly to Instagram / WhatsApp.
 */
export function canShareFiles(): boolean {
  if (!isWebShareSupported()) return false
  try {
    const testFile = new File([""], "test.png", { type: "image/png" })
    return (navigator.canShare?.({ files: [testFile] }) ?? false)
  } catch {
    return false
  }
}
