export const siteConfig = {
  name: "Alpha Trainer",
  shortName: "Alpha Trainer",
  slogan: "Entrena con inteligencia. Progresa con datos.",
  description:
    "Alpha Trainer es tu sistema de entrenamiento personal impulsado por IA. Rutinas personalizadas según tu objetivo, guía de ejecución con demostraciones visuales y seguimiento de progreso real.",
  branding: {
    primary: "#CF2020",
    secondary: "#141415",
    background: "#0A0A0B",
    text: "#F2F2F3",
  },
  contact: {
    email: "hola@alphatrainer.app",
  },
  navigation: [
    { label: "Funcionalidades", href: "#funcionalidades" },
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Ejercicios", href: "#ejercicios" },
    { label: "Precios", href: "#precios" },
  ],
  institutional: {
    heroTitle: "Tu sistema de entrenamiento personal, impulsado por IA.",
    heroSubtitle:
      "Rutinas generadas para tu objetivo. Guía de ejecución. Progreso medido.",
    ctaPrimary: "Comenzar gratis",
    ctaSecondary: "Ver cómo funciona",
  },
  supabase: {
    profilesTable: "profiles",
    eventsTable: "analytics_events",
    routineTable: "routine_recommendations",
    downloadsTable: "user_resource_downloads",
  },
} as const

export type SiteConfig = typeof siteConfig
