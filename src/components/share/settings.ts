/**
 * Share card user preferences — presets, defaults, and localStorage persistence.
 */

import type { ShareHighlightType, ShareMetricVisibility, SharePreset } from "./types"

// ── Per-preset defaults ───────────────────────────────────────────────────────

/**
 * Default metric visibility for each preset.
 * Applied when the user switches presets.
 * volume is NEVER true by default — it is always opt-in.
 */
export const PRESET_VISIBILITY: Record<SharePreset, ShareMetricVisibility> = {
  achievement: {
    workoutName:   true,
    duration:      true,
    sets:          false,  // highlight is the hero; secondary sets count is optional
    reps:          false,  // highlight is the hero; secondary reps count is optional
    exerciseCount: true,
    date:          true,
    volume:        false,
  },
  minimal: {
    workoutName:   true,
    duration:      true,
    sets:          false,
    reps:          false,
    exerciseCount: true,
    date:          true,
    volume:        false,
  },
  full: {
    workoutName:   true,
    duration:      true,
    sets:          true,
    reps:          true,
    exerciseCount: true,
    date:          true,
    volume:        false,  // still opt-in even in Full Stats
  },
}

export const DEFAULT_PRESET: SharePreset = "achievement"

// ── Persistence ───────────────────────────────────────────────────────────────

const PREFS_KEY = "alpha-trainer.share-preferences.v1"

export interface SharePreferences {
  preset:              SharePreset
  highlightMode:       "auto" | "manual"
  manualHighlightType: ShareHighlightType | null
  visibility:          ShareMetricVisibility
}

function defaultPrefs(): SharePreferences {
  return {
    preset:              DEFAULT_PRESET,
    highlightMode:       "auto",
    manualHighlightType: null,
    visibility:          { ...PRESET_VISIBILITY[DEFAULT_PRESET] },
  }
}

/** Loads persisted share preferences from localStorage. Falls back to defaults on any error. */
export function loadSharePrefs(): SharePreferences {
  if (typeof window === "undefined") return defaultPrefs()
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return defaultPrefs()
    const parsed = JSON.parse(raw) as Partial<SharePreferences>

    // Validate and merge with defaults to handle schema changes
    const defaults = defaultPrefs()
    return {
      preset:              isValidPreset(parsed.preset)        ? parsed.preset         : defaults.preset,
      highlightMode:       parsed.highlightMode === "manual"   ? "manual"              : "auto",
      manualHighlightType: parsed.manualHighlightType          ?? null,
      visibility:          mergeVisibility(parsed.visibility, defaults.visibility),
    }
  } catch {
    return defaultPrefs()
  }
}

/** Persists share preferences to localStorage. Silently ignores any error. */
export function saveSharePrefs(prefs: SharePreferences): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Ignore storage errors (private browsing, quota exceeded, etc.)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidPreset(v: unknown): v is SharePreset {
  return v === "achievement" || v === "minimal" || v === "full"
}

function mergeVisibility(
  saved:    Partial<ShareMetricVisibility> | undefined,
  defaults: ShareMetricVisibility,
): ShareMetricVisibility {
  if (!saved || typeof saved !== "object") return defaults
  return {
    workoutName:   saved.workoutName   ?? defaults.workoutName,
    duration:      saved.duration      ?? defaults.duration,
    sets:          saved.sets          ?? defaults.sets,
    reps:          saved.reps          ?? defaults.reps,
    exerciseCount: saved.exerciseCount ?? defaults.exerciseCount,
    date:          saved.date          ?? defaults.date,
    // Never restore volume=true from old prefs without user action
    volume:        saved.volume === true ? true : false,
  }
}
