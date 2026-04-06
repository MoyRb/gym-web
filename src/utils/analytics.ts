import type { AnalyticsEvent } from "@/types"

function trackEvent(event: string, properties?: Record<string, unknown>): void {
  const payload: AnalyticsEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  }
  // TODO: Connect to real analytics (Supabase, Mixpanel, Plausible, etc.)
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", payload)
  }
}

export const analytics = {
  login: (method = "email") =>
    trackEvent("login", { method }),

  register: (method = "email") =>
    trackEvent("register", { method }),

  perfilCompletado: (objetivo: string, experiencia: string) =>
    trackEvent("perfil_completado", { objetivo, experiencia }),

  rutinaVista: (rutinaId: string, rutinaTitle: string) =>
    trackEvent("rutina_vista", { rutinaId, rutinaTitle }),

  pdfDescargado: (pdfId: string, pdfTitle: string) =>
    trackEvent("pdf_descargado", { pdfId, pdfTitle }),

  dashboardVisitado: () =>
    trackEvent("dashboard_visitado"),
}
