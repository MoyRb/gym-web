/**
 * CONFIGURACIÓN CENTRAL DEL GIMNASIO
 * ──────────────────────────────────────────────────────────────────────
 * Aquí puedes cambiar nombre, logo, colores, contacto y textos del sitio.
 * No necesitas tocar ningún otro archivo para personalizar la marca.
 */

export const siteConfig = {
  // ── Identidad ──────────────────────────────────────────────────────
  name: "Fitnes Club",
  shortName: "Fitnes Club",
  tagline: "Entrena con propósito. Vive con energía.",
  description:
    "Plataforma privada del gimnasio Fitnes Club. Accede a tus rutinas personalizadas, descarga material exclusivo y lleva el control de tu progreso físico.",

  // ── Logo ────────────────────────────────────────────────────────────
  logo: {
    /** Ruta relativa a /public. Si no existe, se usará el fallback de texto. */
    src: "/logo.png",
    alt: "Fitnes Club",
    /** Texto que se muestra si el logo no carga */
    fallback: "Fitnes Club",
    /** Dimensiones del logo en el header */
    width: 120,
    height: 40,
  },

  // ── Colores (referencia, los reales están en globals.css) ───────────
  brand: {
    primary: "#E11392",
    secondary: "#323E49",
    background: "#F7F7F7",
    foreground: "#1F2937",
  },

  // ── Contacto y horarios ─────────────────────────────────────────────
  contact: {
    phone: "+34 XXX XXX XXX",
    email: "info@fitnesclub.com",
    address: "Calle del Gimnasio, 1 — Tu ciudad",
    googleMapsUrl: "#",
    hours: [
      { days: "Lunes – Viernes", time: "07:00 – 22:00" },
      { days: "Sábado", time: "08:00 – 20:00" },
      { days: "Domingo", time: "09:00 – 14:00" },
    ],
    social: {
      instagram: "#",
      facebook: "#",
      whatsapp: "#",
    },
  },

  // ── Navegación pública ──────────────────────────────────────────────
  navLinks: [
    { label: "Beneficios", href: "#beneficios" },
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Rutinas", href: "#rutinas" },
    { label: "Testimonios", href: "#testimonios" },
    { label: "Contacto", href: "#contacto" },
  ],

  // ── Meta SEO ────────────────────────────────────────────────────────
  meta: {
    title: "Fitnes Club — Entrena con propósito",
    titleTemplate: "%s | Fitnes Club",
    favicon: "/favicon.png",
  },
} as const

export type SiteConfig = typeof siteConfig
