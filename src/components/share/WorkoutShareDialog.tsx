"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Download, ImagePlus, Loader2, X } from "lucide-react"
import { toPng } from "html-to-image"

import { createClient } from "@/lib/supabase/client"
import type { WorkoutSessionWithExercises } from "@/types/database"
import { Button } from "@/components/ui/button"
import { analytics } from "@/utils/analytics"

import { WorkoutShareCard } from "./WorkoutShareCard"
import {
  detectHighlights,
  getHighlightLabel,
  selectAutoHighlight,
  type ExerciseHistory,
} from "./highlight"
import type { ShareSetState } from "./normalize"
import {
  DEFAULT_PRESET,
  loadSharePrefs,
  PRESET_VISIBILITY,
  saveSharePrefs,
} from "./settings"
import { getShareFilename } from "./formatters"
import type {
  ShareCardOptions,
  ShareHighlight,
  ShareHighlightType,
  ShareMetricVisibility,
  SharePreset,
  WorkoutShareData,
} from "./types"
import { CARD_DIMS } from "./types"

// ── Preview sizing ─────────────────────────────────────────────────────────────

const PREVIEW_W = 160
const PREVIEW_SCALE = PREVIEW_W / CARD_DIMS.w
const PREVIEW_H = Math.round(CARD_DIMS.h * PREVIEW_SCALE)

// ── PNG generation ─────────────────────────────────────────────────────────────

async function cardToPng(el: HTMLDivElement): Promise<Blob> {
  await document.fonts.ready
  const dataUrl = await toPng(el, { pixelRatio: 2, cacheBust: true })
  const res = await fetch(dataUrl)
  return res.blob()
}

// ── History fetch ──────────────────────────────────────────────────────────────

async function fetchExerciseHistory(
  sessionId:   string,
  exerciseIds: string[],
): Promise<Map<string, ExerciseHistory> | null> {
  if (exerciseIds.length === 0) return null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // 1. Get last 30 completed sessions for this user (excluding current)
    const { data: prevSessions, error: e1 } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("status", "completed")
      .neq("id", sessionId)
      .order("completed_at", { ascending: false })
      .limit(30)
    if (e1 || !prevSessions || prevSessions.length === 0) return null

    const prevSessionIds = prevSessions.map((s) => s.id)

    // 2. Get session exercises matching our exercise_ids from those sessions
    const { data: prevExercises, error: e2 } = await supabase
      .from("workout_session_exercises")
      .select("id, exercise_id, workout_session_id")
      .in("workout_session_id", prevSessionIds)
      .in("exercise_id", exerciseIds)
    if (e2 || !prevExercises || prevExercises.length === 0) return null

    const prevExerciseIds = prevExercises.map((e) => e.id)

    // 3. Get completed sets for those exercises
    const { data: prevSets, error: e3 } = await supabase
      .from("workout_sets")
      .select("workout_session_exercise_id, weight_kg, reps")
      .in("workout_session_exercise_id", prevExerciseIds)
      .eq("completed", true)
    if (e3 || !prevSets) return null

    // Build history map
    const historyMap = new Map<string, ExerciseHistory>()

    // Track which sessions each exercise appeared in
    const exerciseSessionCount = new Map<string, Set<string>>()
    for (const ex of prevExercises) {
      if (!exerciseSessionCount.has(ex.exercise_id)) {
        exerciseSessionCount.set(ex.exercise_id, new Set())
      }
      exerciseSessionCount.get(ex.exercise_id)!.add(ex.workout_session_id)
    }

    for (const ex of prevExercises) {
      if (!historyMap.has(ex.exercise_id)) {
        historyMap.set(ex.exercise_id, {
          exerciseId:       ex.exercise_id,
          prevBestWeightKg: null,
          prevBestReps:     null,
          sessionCount:     exerciseSessionCount.get(ex.exercise_id)?.size ?? 0,
        })
      }

      const entry = historyMap.get(ex.exercise_id)!
      const sets  = prevSets.filter((s) => s.workout_session_exercise_id === ex.id)

      for (const s of sets) {
        if (s.weight_kg !== null) {
          if (entry.prevBestWeightKg === null || s.weight_kg > entry.prevBestWeightKg) {
            entry.prevBestWeightKg = s.weight_kg
          }
        }
        if (s.reps !== null) {
          if (entry.prevBestReps === null || s.reps > entry.prevBestReps) {
            entry.prevBestReps = s.reps
          }
        }
      }
    }

    return historyMap
  } catch {
    return null
  }
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  )
}

// ── Toggle switch ──────────────────────────────────────────────────────────────

function MetricToggle({
  label,
  checked,
  onChange,
}: {
  label:    string
  checked:  boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 py-1">
      <span className="text-xs text-foreground/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          checked ? "bg-primary" : "bg-muted-foreground/30",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150",
            checked ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </label>
  )
}

// ── Dialog ─────────────────────────────────────────────────────────────────────

export interface WorkoutShareDialogProps {
  data:      WorkoutShareData
  session:   WorkoutSessionWithExercises
  setStates: Map<string, ShareSetState>
  open:      boolean
  onClose:   () => void
}

/**
 * Share customization dialog / bottom sheet.
 *
 * Sections:
 *   1. Preview — live card preview (updates on any option change)
 *   2. Estilo — preset selector (Achievement / Minimal / Full Stats)
 *   3. Highlight — manual or auto highlight selector (Achievement only)
 *   4. Datos — metric visibility toggles
 *
 * PNG is generated ONLY when "Descargar" is tapped — never on preview changes.
 * User preferences are persisted to localStorage (no workout data stored).
 */
export function WorkoutShareDialog({
  data,
  session,
  setStates,
  open,
  onClose,
}: WorkoutShareDialogProps) {
  // ── State ──────────────────────────────────────────────────────────────────

  const prefs = useRef(loadSharePrefs())

  const [preset,        setPreset]        = useState<SharePreset>(prefs.current.preset)
  const [highlightMode, setHighlightMode] = useState<"auto" | "manual">(prefs.current.highlightMode)
  const [visibility,    setVisibility]    = useState<ShareMetricVisibility>({ ...prefs.current.visibility })

  const [allHighlights,    setAllHighlights]    = useState<ShareHighlight[]>([])
  const [selectedHighlight, setSelectedHighlight] = useState<ShareHighlight | null>(null)
  const [historyLoaded,    setHistoryLoaded]    = useState(false)

  const [exporting,    setExporting]    = useState(false)
  const [exportError,  setExportError]  = useState<string | null>(null)
  const [userPhoto,    setUserPhoto]    = useState<string | null>(null)

  const cardRef      = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // ── Compute session-local highlights immediately on open ───────────────────

  useEffect(() => {
    if (!open) return

    const highlights = detectHighlights(session, setStates, data)
    setAllHighlights(highlights)
    setHistoryLoaded(false)

    // Restore manual selection if available and still in list
    const savedType = prefs.current.manualHighlightType
    if (prefs.current.highlightMode === "manual" && savedType) {
      const found = highlights.find((h) => h.type === savedType)
      setSelectedHighlight(found ?? selectAutoHighlight(highlights))
    } else {
      setSelectedHighlight(selectAutoHighlight(highlights))
    }
  }, [open, session, setStates, data])

  // ── Fetch history in background after open ─────────────────────────────────

  useEffect(() => {
    if (!open || historyLoaded) return

    const exerciseIds = session.exercises.map((e) => e.exercise_id)
    void fetchExerciseHistory(session.id, exerciseIds).then((history) => {
      if (!history) { setHistoryLoaded(true); return }

      const highlights = detectHighlights(session, setStates, data, history)
      setAllHighlights(highlights)
      setHistoryLoaded(true)

      // Update auto-highlight if in auto mode
      if (highlightMode === "auto") {
        setSelectedHighlight(selectAutoHighlight(highlights))
      }
    })
  }, [open, historyLoaded, session, setStates, data, highlightMode])

  // ── Derived active highlight ───────────────────────────────────────────────

  const activeHighlight = selectedHighlight ?? selectAutoHighlight(allHighlights)

  // ── Card options (live, no PNG gen) ───────────────────────────────────────

  const cardOptions: ShareCardOptions = {
    preset,
    highlight:     activeHighlight,
    highlightMode,
    visibility,
    userPhoto:     userPhoto ?? undefined,
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePresetChange = (p: SharePreset) => {
    const nextVis = { ...PRESET_VISIBILITY[p] }
    // Carry over volume if the user had explicitly enabled it
    if (visibility.volume) nextVis.volume = true
    setPreset(p)
    setVisibility(nextVis)
    setExportError(null)
    saveSharePrefs({ preset: p, highlightMode, manualHighlightType: getManualType(), visibility: nextVis })
    void analytics.shareCardPresetSelected(p)
  }

  const handleHighlightChange = (h: ShareHighlight, mode: "auto" | "manual") => {
    setHighlightMode(mode)
    setSelectedHighlight(mode === "auto" ? selectAutoHighlight(allHighlights) : h)
    saveSharePrefs({ preset, highlightMode: mode, manualHighlightType: mode === "manual" ? h.type : null, visibility })
    void analytics.shareCardHighlightSelected(h.type, mode)
  }

  const handleVisibilityChange = (key: keyof ShareMetricVisibility, value: boolean) => {
    const next = { ...visibility, [key]: value }
    setVisibility(next)
    saveSharePrefs({ preset, highlightMode, manualHighlightType: getManualType(), visibility: next })
    void analytics.shareCardMetricToggled(key, value)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result
      if (typeof result === "string") setUserPhoto(result)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleDownload = useCallback(async () => {
    if (exporting || !cardRef.current) return
    setExporting(true)
    setExportError(null)
    try {
      const blob = await cardToPng(cardRef.current)
      void analytics.shareCardDownloaded({
        preset,
        highlightType: activeHighlight.type,
        volumeVisible: visibility.volume,
      })
      const url = URL.createObjectURL(blob)
      const a   = document.createElement("a")
      a.href     = url
      a.download = getShareFilename(data.date)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setExportError("No pudimos generar la imagen. Intenta nuevamente.")
    } finally {
      setExporting(false)
    }
  }, [exporting, preset, activeHighlight, visibility, data])

  const getManualType = (): ShareHighlightType | null =>
    highlightMode === "manual" ? (selectedHighlight?.type ?? null) : null

  // ── Preset labels ──────────────────────────────────────────────────────────

  const PRESET_LABELS: Record<SharePreset, string> = {
    achievement: "Achievement",
    minimal:     "Minimal",
    full:        "Full Stats",
  }

  // Metric toggle config
  const metricToggles: { key: keyof ShareMetricVisibility; label: string; optIn?: boolean }[] = [
    { key: "duration",      label: "Duración"    },
    { key: "sets",          label: "Series"      },
    { key: "reps",          label: "Reps"        },
    { key: "exerciseCount", label: "Ejercicios"  },
    { key: "date",          label: "Fecha"       },
    { key: "volume",        label: "Volumen", optIn: true },
  ]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPrimitive.Portal>
        {/* Backdrop — z-[70] clears the training page at z-[60] */}
        <DialogPrimitive.Backdrop className="fixed inset-0 z-[70] bg-black/60 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />

        {/* Sheet / Modal */}
        <DialogPrimitive.Popup
          aria-labelledby="share-dialog-title"
          className={[
            // Mobile: scrollable bottom sheet
            "fixed bottom-0 left-0 right-0 z-[70]",
            "max-h-[92dvh] overflow-y-auto",
            "rounded-t-2xl bg-popover px-5 pt-5",
            "ring-1 ring-foreground/10 outline-none",
            // Desktop: centered modal
            "sm:bottom-auto sm:left-1/2 sm:top-1/2",
            "sm:w-full sm:max-w-sm sm:rounded-xl",
            "sm:-translate-x-1/2 sm:-translate-y-1/2",
            "sm:max-h-[90dvh]",
            // Animations
            "duration-200",
            "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-4",
            "sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95",
            "sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95",
          ].join(" ")}
        >
          {/* ── Header ── */}
          <div className="mb-4 flex items-center justify-between">
            <DialogPrimitive.Title
              id="share-dialog-title"
              className="font-heading text-base font-semibold"
            >
              Compartir resultado
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              render={
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Cerrar"
                />
              }
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* ── Preview ── */}
          <div className="mb-5 flex justify-center">
            <div
              aria-hidden="true"
              style={{
                width:        PREVIEW_W,
                height:       PREVIEW_H,
                position:     "relative",
                overflow:     "hidden",
                borderRadius: 8,
                flexShrink:   0,
                background:   "#0A0A0B",
              }}
            >
              <div
                style={{
                  transform:       `scale(${PREVIEW_SCALE})`,
                  transformOrigin: "top left",
                  position:        "absolute",
                  top:             0,
                  left:            0,
                  width:           CARD_DIMS.w,
                  height:          CARD_DIMS.h,
                }}
              >
                <WorkoutShareCard ref={cardRef} data={data} options={cardOptions} />
              </div>
            </div>
          </div>

          {/* ── ESTILO ── */}
          <div className="mb-4">
            <SectionLabel>Estilo</SectionLabel>
            <div className="flex rounded-lg bg-muted p-1 gap-1" role="group" aria-label="Estilo de tarjeta">
              {(["achievement", "minimal", "full"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={preset === p}
                  onClick={() => handlePresetChange(p)}
                  className={[
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    preset === p
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {PRESET_LABELS[p]}
                  {p === DEFAULT_PRESET && preset !== p && (
                    <span className="ml-1 text-[9px] opacity-50">★</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── HIGHLIGHT (Achievement only) ── */}
          {preset === "achievement" && allHighlights.length > 0 && (
            <div className="mb-4">
              <SectionLabel>Highlight</SectionLabel>
              <div className="space-y-0.5">
                {/* Auto option */}
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/50">
                  <input
                    type="radio"
                    name="highlight"
                    checked={highlightMode === "auto"}
                    onChange={() => handleHighlightChange(selectAutoHighlight(allHighlights), "auto")}
                    className="accent-primary"
                  />
                  <span className="text-xs font-medium">Automático</span>
                  {highlightMode === "auto" && (
                    <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {activeHighlight.headline}
                    </span>
                  )}
                </label>

                {/* Manual options (deduplicated by type) */}
                {allHighlights.map((h) => (
                  <label
                    key={h.type}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/50"
                  >
                    <input
                      type="radio"
                      name="highlight"
                      checked={highlightMode === "manual" && selectedHighlight?.type === h.type}
                      onChange={() => handleHighlightChange(h, "manual")}
                      className="accent-primary"
                    />
                    <span className="text-xs">{getHighlightLabel(h.type)}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {h.headline}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── DATOS ── */}
          <div className="mb-4">
            <SectionLabel>Datos</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4">
              {metricToggles.map(({ key, label, optIn }) => (
                <div key={key} className={optIn ? "col-span-2 border-t border-border/50 pt-1 mt-1" : ""}>
                  <MetricToggle
                    label={optIn ? `${label} (opcional)` : label}
                    checked={visibility[key]}
                    onChange={(v) => handleVisibilityChange(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Usar mi foto ── */}
          <div className="mb-4 flex items-center justify-between border-t border-border/50 pt-3">
            <p className="text-xs text-muted-foreground">Fondo personalizado</p>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-foreground/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              onClick={() => photoInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              {userPhoto ? "Cambiar foto" : "Usar mi foto"}
            </button>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handlePhotoSelect}
          />

          {/* ── Error ── */}
          {exportError && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
            >
              {exportError}
            </p>
          )}

          {/* ── Download button ── */}
          <div className="pb-5">
            <Button
              onClick={() => void handleDownload()}
              disabled={exporting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparando imagen...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar imagen
                </>
              )}
            </Button>

            {/* Safe area padding */}
            <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
