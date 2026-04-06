import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/types/database"

export const analyticsEvents = {
  register: "register",
  login: "login",
  profileCompleted: "profile_completed",
  routineViewed: "routine_viewed",
  pdfDownloaded: "pdf_downloaded",
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
}
