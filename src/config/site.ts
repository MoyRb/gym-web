export const siteConfig = {
  name: "FITNESS CLUB",
  shortName: "FITNESS CLUB",
  slogan: "Entrena con propósito. Vive con energía.",
  description:
    "Plataforma web del gimnasio FITNESS CLUB para gestionar tu perfil físico, calcular IMC, recibir rutinas y descargar material de apoyo.",
  logo: {
    src: "/logo.png",
    alt: "Logo FITNESS CLUB",
    fallback: "FITNESS CLUB",
    width: 140,
    height: 40,
  },
  branding: {
    primary: "#E11392",
    secondary: "#323E49",
    background: "#F7F7F7",
    text: "#1F2937",
  },
  contact: {
    phone: "+1 (305) 555-0142",
    whatsapp: "+13055550142",
    email: "contacto@fitnessclub.com",
    address: "1250 Fitness Ave, Miami, FL",
    googleMapsUrl: "https://maps.google.com",
    hours: [
      { days: "Lunes - Viernes", time: "06:00 - 22:00" },
      { days: "Sábado", time: "08:00 - 18:00" },
      { days: "Domingo", time: "09:00 - 14:00" },
    ],
    social: {
      instagram: "https://instagram.com/fitnessclub",
      facebook: "https://facebook.com/fitnessclub",
      tiktok: "https://tiktok.com/@fitnessclub",
    },
  },
  navigation: [
    { label: "Inicio", href: "#inicio" },
    { label: "Beneficios", href: "#beneficios" },
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Rutinas", href: "#rutinas" },
    { label: "Testimonios", href: "#testimonios" },
    { label: "Contacto", href: "#contacto" },
  ],
  institutional: {
    heroTitle: "Tu gimnasio de verdad, ahora también en línea",
    heroSubtitle:
      "Completa tu perfil, calcula tu IMC y recibe una rutina inicial según tu objetivo. Todo pensado para tu progreso real.",
    ctaPrimary: "Crear cuenta",
    ctaSecondary: "Iniciar sesión",
  },
  supabase: {
    profilesTable: "profiles",
    eventsTable: "analytics_events",
    routineTable: "routine_recommendations",
    downloadsTable: "user_resource_downloads",
  },
} as const

export type SiteConfig = typeof siteConfig
