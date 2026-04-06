import type { AnalyticsEvent } from "@/types"

export const analyticsEvents = {
  register: "register",
  login: "login",
  profileCompleted: "profile_completed",
  routineViewed: "routine_viewed",
  pdfDownloaded: "pdf_downloaded",
} as const

function trackEvent(event: string, properties?: Record<string, unknown>): void {
  const payload: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  }

  // TODO: conectar con tabla `events` en Supabase
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", payload)
  }
}

export const analytics = {
  login: (method = "email") => trackEvent(analyticsEvents.login, { method }),
  register: (method = "email") => trackEvent(analyticsEvents.register, { method }),
  profileCompleted: (objetivo: string, experiencia: string) =>
    trackEvent(analyticsEvents.profileCompleted, { objetivo, experiencia }),
  routineViewed: (rutinaId: string, rutinaTitle: string) =>
    trackEvent(analyticsEvents.routineViewed, { rutinaId, rutinaTitle }),
  pdfDownloaded: (pdfId: string, pdfTitle: string) =>
    trackEvent(analyticsEvents.pdfDownloaded, { pdfId, pdfTitle }),
}
