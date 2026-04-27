export const siteConfig = {
  name: "FITNESS CLUB",
  shortName: "FITNESS CLUB",
  slogan: "Entrena con propósito. Progresa con acompañamiento real.",
  description:
    "Plataforma web oficial de FITNESS CLUB para dar seguimiento a tu progreso, consultar rutinas y mantener tu entrenamiento conectado dentro y fuera del gimnasio.",
  branding: {
    primary: "#E11392",
    secondary: "#323E49",
    background: "#F7F7F7",
    text: "#1F2937",
  },
  contact: {
    phone: "773 954 2064",
    whatsapp: "527739542064",
    email: "contacto@fitnessclub.com",
    address: "Calle Aquiles Serdán #44, Chilchota, Michoacán",
    googleMapsUrl: "https://maps.google.com/?q=Calle+Aquiles+Serd%C3%A1n+44,+Chilchota,+Michoac%C3%A1n",
    hours: [
      { days: "Lunes a viernes", time: "6:30 AM a 9:00 PM" },
      { days: "Sábados", time: "7:00 AM a 2:30 PM" },
      { days: "Domingos", time: "Cerrado" },
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
    heroTitle: "Gimnasio real en Chilchota, ahora también conectado en línea",
    heroSubtitle:
      "En FITNESS CLUB entrenas con acompañamiento profesional, recibes rutinas según tu objetivo y das seguimiento a tu progreso desde la plataforma cuando no estás en el gym.",
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
