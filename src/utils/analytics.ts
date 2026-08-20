import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/types/database"

export const analyticsEvents = {
  register: "register",
  login: "login",
  profileCompleted: "profile_completed",
  routineViewed: "routine_viewed",
  pdfDownloaded: "pdf_downloaded",
  // ── Share card ──────────────────────────────────────────────
  shareCardOpened:          "share_card_opened",
  shareCardPresetSelected:  "share_card_preset_selected",
  shareCardHighlightSelected: "share_card_highlight_selected",
  shareCardMetricToggled:   "share_card_metric_toggled",
  shareCardDownloaded:      "share_card_downloaded",
  shareCardShared:          "share_card_shared",
} as const

async function trackEvent(eventType: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      metadata: (metadata ?? {}) as Json,
    })
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Analytics error]", error)
    }
  }
}

export const analytics = {
  login: (method = "username") => trackEvent(analyticsEvents.login, { method }),
  register: (method = "username") => trackEvent(analyticsEvents.register, { method }),
  profileCompleted: (objetivo: string, experiencia: string) =>
    trackEvent(analyticsEvents.profileCompleted, { objetivo, experiencia }),
  routineViewed: (rutinaId: string, rutinaTitle: string) =>
    trackEvent(analyticsEvents.routineViewed, { rutinaId, rutinaTitle }),
  pdfDownloaded: (pdfId: string, pdfTitle: string, category?: string) =>
    trackEvent(analyticsEvents.pdfDownloaded, { pdfId, pdfTitle, category }),
  // ── Share card events ──────────────────────────────────────────────────────
  // PRIVACY: never include weight values, volume amounts, reps counts, PII.
  // Only boolean flags and categorical strings are allowed.
  shareCardOpened:     (preset: string) => trackEvent(analyticsEvents.shareCardOpened, { preset }),
  shareCardPresetSelected: (preset: string) =>
    trackEvent(analyticsEvents.shareCardPresetSelected, { preset }),
  shareCardHighlightSelected: (highlightType: string, mode: string) =>
    trackEvent(analyticsEvents.shareCardHighlightSelected, { highlight_type: highlightType, mode }),
  shareCardMetricToggled: (metric: string, enabled: boolean) =>
    trackEvent(analyticsEvents.shareCardMetricToggled, { metric, enabled }),
  shareCardDownloaded: (opts: { preset: string; highlightType: string; volumeVisible: boolean }) =>
    trackEvent(analyticsEvents.shareCardDownloaded, {
      preset:           opts.preset,
      highlight_type:   opts.highlightType,
      volume_visible:   opts.volumeVisible,
      // NOT included: actual volume amount, weight values, reps counts
    }),
  shareCardShared: (opts: { preset: string; highlightType: string; volumeVisible: boolean }) =>
    trackEvent(analyticsEvents.shareCardShared, {
      preset:         opts.preset,
      highlight_type: opts.highlightType,
      volume_visible: opts.volumeVisible,
    }),
}
