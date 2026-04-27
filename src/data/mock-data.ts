import type { Rutina, RecursoPDF, Testimonio, UserProfile } from "@/types"

export const mockProfile: UserProfile = {
  nombre: "Alex García",
  edad: 28,
  sexo: "masculino",
  peso_kg: 78,
  altura_cm: 178,
  experiencia: "principiante",
  objetivo: "ganar_masa_muscular",
  dias_por_semana: 3,
}

export const mockRutinas: Rutina[] = []


export const mockRecursos: RecursoPDF[] = [
  {
    id: "guia-nutricion-hipertrofia",
    slug: "guia-nutricion-hipertrofia",
    titulo: "Guía de Nutrición para Hipertrofia",
    descripcion: "Todo lo que necesitas saber sobre calorías, macros y timing nutricional para ganar masa muscular.",
    categoria: "nutricion",
    paginas: 24,
    tamaño: "2.4 MB",
    url: "/api/resources/guia-nutricion-hipertrofia/pdf",
    destacado: true,
  },
  {
    id: "plan-deficit-calorico",
    slug: "plan-deficit-calorico",
    titulo: "Plan de Déficit Calórico Inteligente",
    descripcion: "Estrategias prácticas para crear un déficit calórico sin perder músculo ni rendimiento.",
    categoria: "nutricion",
    paginas: 18,
    tamaño: "1.8 MB",
    url: "/api/resources/plan-deficit-calorico/pdf",
  },
  {
    id: "tecnica-ejercicios-basicos",
    slug: "tecnica-ejercicios-basicos",
    titulo: "Técnica Perfecta: Los 5 Básicos",
    descripcion: "Guía visual con instrucciones detalladas para sentadilla, press, peso muerto, dominadas y remo.",
    categoria: "entrenamiento",
    paginas: 32,
    tamaño: "4.1 MB",
    url: "/api/resources/tecnica-ejercicios-basicos/pdf",
    destacado: true,
  },
  {
    id: "movilidad-articular",
    slug: "movilidad-articular",
    titulo: "Rutina de Movilidad Articular",
    descripcion: "Secuencia de 15 minutos para mejorar la movilidad y prevenir lesiones.",
    categoria: "recuperacion",
    paginas: 12,
    tamaño: "1.2 MB",
    url: "/api/resources/movilidad-articular/pdf",
  },
  {
    id: "psicologia-deportiva",
    slug: "psicologia-deportiva",
    titulo: "Mentalidad del Atleta",
    descripcion: "Técnicas de psicología deportiva para mantener la motivación y superar mesetas.",
    categoria: "motivacion",
    paginas: 20,
    tamaño: "1.6 MB",
    url: "/api/resources/psicologia-deportiva/pdf",
  },
  {
    id: "suenos-y-recuperacion",
    slug: "suenos-y-recuperacion",
    titulo: "Optimiza tu Sueño y Recuperación",
    descripcion: "Protocolos de sueño, estiramientos post-entreno y técnicas de recuperación activa.",
    categoria: "recuperacion",
    paginas: 16,
    tamaño: "1.9 MB",
    url: "/api/resources/suenos-y-recuperacion/pdf",
  },
]

export const mockTestimonios: Testimonio[] = [
  {
    id: "1",
    nombre: "Marta Rodríguez",
    avatar: "MR",
    cargo: "Profesora universitaria",
    texto: "Llevaba años sin hacer ejercicio y no sabía por dónde empezar. La plataforma me dio una rutina adaptada a mi nivel y los recursos son clarísimos. Bajé 8 kg en 3 meses.",
    rating: 5,
    objetivo: "Pérdida de grasa",
  },
  {
    id: "2",
    nombre: "Carlos Méndez",
    avatar: "CM",
    cargo: "Ingeniero de software",
    texto: "Las rutinas personalizadas por objetivo son lo mejor que he encontrado. No gasto tiempo eligiendo qué hacer en el gimnasio, simplemente sigo el plan y los resultados hablan solos.",
    rating: 5,
    objetivo: "Hipertrofia",
  },
  {
    id: "3",
    nombre: "Laura Sánchez",
    avatar: "LS",
    cargo: "Nutricionista",
    texto: "Me encanta la integración entre el perfil físico y las recomendaciones. El cálculo del IMC y los consejos son precisos y acordes con lo que recomendamos los profesionales.",
    rating: 5,
    objetivo: "Condición general",
  },
  {
    id: "4",
    nombre: "Javier Torres",
    avatar: "JT",
    cargo: "Corredor aficionado",
    texto: "Mejoré mi resistencia considerablemente siguiendo el plan de 5 días. Los PDFs de movilidad y recuperación son un complemento perfecto para quien hace cardio intenso.",
    rating: 5,
    objetivo: "Resistencia",
  },
]
