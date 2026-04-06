import type { Rutina, RecursoPDF, Testimonio, Plan, UserProfile } from "@/types"

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

export const mockRutinas: Rutina[] = [
  {
    id: "hipertrofia-principiante-3",
    titulo: "Hipertrofia para Principiantes",
    descripcion: "Rutina de 3 días enfocada en construir masa muscular con movimientos compuestos básicos.",
    objetivo: "ganar_masa_muscular",
    experiencia: "principiante",
    dias_por_semana: 3,
    duracion_semanas: 8,
    dias: [
      {
        dia: "Día 1 — Pecho & Tríceps",
        musculo: "Pecho / Tríceps",
        ejercicios: [
          { nombre: "Press de banca", series: 3, repeticiones: "8-10", descanso: "90s" },
          { nombre: "Press inclinado con mancuernas", series: 3, repeticiones: "10-12", descanso: "75s" },
          { nombre: "Fondos en paralelas", series: 3, repeticiones: "8-10", descanso: "60s" },
          { nombre: "Extensión de tríceps polea", series: 3, repeticiones: "12-15", descanso: "60s" },
        ],
      },
      {
        dia: "Día 2 — Espalda & Bíceps",
        musculo: "Espalda / Bíceps",
        ejercicios: [
          { nombre: "Dominadas asistidas", series: 3, repeticiones: "6-8", descanso: "90s" },
          { nombre: "Remo con barra", series: 3, repeticiones: "8-10", descanso: "90s" },
          { nombre: "Jalón al pecho", series: 3, repeticiones: "10-12", descanso: "75s" },
          { nombre: "Curl de bíceps con barra", series: 3, repeticiones: "10-12", descanso: "60s" },
        ],
      },
      {
        dia: "Día 3 — Piernas & Hombros",
        musculo: "Piernas / Hombros",
        ejercicios: [
          { nombre: "Sentadilla con barra", series: 4, repeticiones: "8-10", descanso: "120s" },
          { nombre: "Prensa de piernas", series: 3, repeticiones: "12-15", descanso: "90s" },
          { nombre: "Press militar", series: 3, repeticiones: "8-10", descanso: "90s" },
          { nombre: "Elevaciones laterales", series: 3, repeticiones: "12-15", descanso: "60s" },
        ],
      },
    ],
  },
  {
    id: "perdida-grasa-4",
    titulo: "Quema de Grasa — 4 Días",
    descripcion: "Rutina de 4 días con circuitos y HIIT para maximizar la pérdida de grasa.",
    objetivo: "bajar_grasa",
    experiencia: "intermedio",
    dias_por_semana: 4,
    duracion_semanas: 10,
    dias: [
      {
        dia: "Día 1 — Full Body HIIT",
        musculo: "Cuerpo completo",
        ejercicios: [
          { nombre: "Burpees", series: 4, repeticiones: "10", descanso: "45s" },
          { nombre: "Sentadilla con salto", series: 4, repeticiones: "12", descanso: "45s" },
          { nombre: "Mountain climbers", series: 4, repeticiones: "20", descanso: "30s" },
          { nombre: "Plancha", series: 3, repeticiones: "45s", descanso: "30s" },
        ],
      },
      {
        dia: "Día 2 — Tren superior",
        musculo: "Pecho / Espalda",
        ejercicios: [
          { nombre: "Flexiones", series: 4, repeticiones: "15", descanso: "45s" },
          { nombre: "Remo con mancuernas", series: 4, repeticiones: "12", descanso: "60s" },
          { nombre: "Press con mancuernas", series: 3, repeticiones: "12", descanso: "60s" },
          { nombre: "Remo horizontal en TRX", series: 3, repeticiones: "15", descanso: "45s" },
        ],
      },
      {
        dia: "Día 3 — Tren inferior",
        musculo: "Piernas / Glúteos",
        ejercicios: [
          { nombre: "Zancadas alternas", series: 4, repeticiones: "12 c/u", descanso: "60s" },
          { nombre: "Sentadilla búlgara", series: 3, repeticiones: "10 c/u", descanso: "75s" },
          { nombre: "Hip thrust", series: 4, repeticiones: "15", descanso: "60s" },
          { nombre: "Saltos a la comba", series: 3, repeticiones: "60s", descanso: "30s" },
        ],
      },
      {
        dia: "Día 4 — Cardio & Core",
        musculo: "Core / Cardio",
        ejercicios: [
          { nombre: "Carrera intervalos (HIIT)", series: 6, repeticiones: "30s sprint / 30s descanso", descanso: "30s" },
          { nombre: "Crunch abdominal", series: 3, repeticiones: "20", descanso: "30s" },
          { nombre: "Plancha lateral", series: 3, repeticiones: "30s c/u", descanso: "30s" },
          { nombre: "Russian twists", series: 3, repeticiones: "16", descanso: "45s" },
        ],
      },
    ],
  },
  {
    id: "resistencia-5",
    titulo: "Resistencia Funcional — 5 Días",
    descripcion: "Programa de 5 días para mejorar la resistencia cardiovascular y funcional.",
    objetivo: "mejorar_resistencia",
    experiencia: "intermedio",
    dias_por_semana: 5,
    duracion_semanas: 12,
    dias: [
      {
        dia: "Día 1 — Carrera base",
        musculo: "Cardio",
        ejercicios: [
          { nombre: "Carrera suave continua", series: 1, repeticiones: "30 min", descanso: "—" },
          { nombre: "Estiramiento dinámico", series: 1, repeticiones: "10 min", descanso: "—" },
        ],
      },
      {
        dia: "Día 2 — Funcional",
        musculo: "Cuerpo completo",
        ejercicios: [
          { nombre: "Kettlebell swing", series: 5, repeticiones: "15", descanso: "45s" },
          { nombre: "Box jumps", series: 4, repeticiones: "10", descanso: "60s" },
          { nombre: "Sentadilla goblet", series: 4, repeticiones: "15", descanso: "45s" },
          { nombre: "Remo TRX", series: 4, repeticiones: "15", descanso: "45s" },
        ],
      },
      {
        dia: "Día 3 — HIIT",
        musculo: "Cardio / Core",
        ejercicios: [
          { nombre: "Tabata (8 rondas)", series: 8, repeticiones: "20s trabajo / 10s descanso", descanso: "10s" },
          { nombre: "Plancha", series: 3, repeticiones: "60s", descanso: "30s" },
        ],
      },
      {
        dia: "Día 4 — Fuerza resistencia",
        musculo: "Tren superior",
        ejercicios: [
          { nombre: "Press banca circuito", series: 4, repeticiones: "15", descanso: "45s" },
          { nombre: "Jalón al pecho", series: 4, repeticiones: "15", descanso: "45s" },
          { nombre: "Fondos", series: 4, repeticiones: "12", descanso: "45s" },
          { nombre: "Curl bíceps", series: 3, repeticiones: "15", descanso: "30s" },
        ],
      },
      {
        dia: "Día 5 — Carrera larga",
        musculo: "Cardio",
        ejercicios: [
          { nombre: "Carrera continua progresiva", series: 1, repeticiones: "45-60 min", descanso: "—" },
        ],
      },
    ],
  },
  {
    id: "condicion-general-3",
    titulo: "Condición Física General — 3 Días",
    descripcion: "Rutina equilibrada para mejorar la condición física general con una combinación de fuerza y cardio.",
    objetivo: "mejorar_condicion_general",
    experiencia: "principiante",
    dias_por_semana: 3,
    duracion_semanas: 8,
    dias: [
      {
        dia: "Día 1 — Full Body Fuerza",
        musculo: "Cuerpo completo",
        ejercicios: [
          { nombre: "Sentadilla con peso corporal", series: 3, repeticiones: "15", descanso: "60s" },
          { nombre: "Flexiones", series: 3, repeticiones: "10-12", descanso: "60s" },
          { nombre: "Remo con banda elástica", series: 3, repeticiones: "12", descanso: "60s" },
          { nombre: "Plancha", series: 3, repeticiones: "30s", descanso: "30s" },
        ],
      },
      {
        dia: "Día 2 — Cardio moderado",
        musculo: "Cardio / Core",
        ejercicios: [
          { nombre: "Bicicleta estática o caminar rápido", series: 1, repeticiones: "20-30 min", descanso: "—" },
          { nombre: "Crunch", series: 3, repeticiones: "15", descanso: "30s" },
          { nombre: "Elevación de piernas", series: 3, repeticiones: "12", descanso: "30s" },
        ],
      },
      {
        dia: "Día 3 — Full Body Circuito",
        musculo: "Cuerpo completo",
        ejercicios: [
          { nombre: "Jumping jacks", series: 3, repeticiones: "30", descanso: "30s" },
          { nombre: "Zancadas", series: 3, repeticiones: "12 c/u", descanso: "45s" },
          { nombre: "Press con mancuernas ligeras", series: 3, repeticiones: "12", descanso: "45s" },
          { nombre: "Remo con mancuernas", series: 3, repeticiones: "12", descanso: "45s" },
        ],
      },
    ],
  },
]

export const mockRecursos: RecursoPDF[] = [
  {
    id: "guia-nutricion-hipertrofia",
    titulo: "Guía de Nutrición para Hipertrofia",
    descripcion: "Todo lo que necesitas saber sobre calorías, macros y timing nutricional para ganar masa muscular.",
    categoria: "nutricion",
    paginas: 24,
    tamaño: "2.4 MB",
    url: "#",
    destacado: true,
  },
  {
    id: "plan-deficit-calorico",
    titulo: "Plan de Déficit Calórico Inteligente",
    descripcion: "Estrategias prácticas para crear un déficit calórico sin perder músculo ni rendimiento.",
    categoria: "nutricion",
    paginas: 18,
    tamaño: "1.8 MB",
    url: "#",
  },
  {
    id: "tecnica-ejercicios-basicos",
    titulo: "Técnica Perfecta: Los 5 Básicos",
    descripcion: "Guía visual con instrucciones detalladas para sentadilla, press, peso muerto, dominadas y remo.",
    categoria: "entrenamiento",
    paginas: 32,
    tamaño: "4.1 MB",
    url: "#",
    destacado: true,
  },
  {
    id: "movilidad-articular",
    titulo: "Rutina de Movilidad Articular",
    descripcion: "Secuencia de 15 minutos para mejorar la movilidad y prevenir lesiones.",
    categoria: "recuperacion",
    paginas: 12,
    tamaño: "1.2 MB",
    url: "#",
  },
  {
    id: "psicologia-deportiva",
    titulo: "Mentalidad del Atleta",
    descripcion: "Técnicas de psicología deportiva para mantener la motivación y superar mesetas.",
    categoria: "motivacion",
    paginas: 20,
    tamaño: "1.6 MB",
    url: "#",
  },
  {
    id: "suenos-y-recuperacion",
    titulo: "Optimiza tu Sueño y Recuperación",
    descripcion: "Protocolos de sueño, estiramientos post-entreno y técnicas de recuperación activa.",
    categoria: "recuperacion",
    paginas: 16,
    tamaño: "1.9 MB",
    url: "#",
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

export const mockPlanes: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    precio: 0,
    periodo: "mes",
    descripcion: "Perfecto para comenzar tu transformación.",
    caracteristicas: [
      "Perfil físico completo",
      "Cálculo de IMC",
      "1 rutina personalizada",
      "Acceso a 2 PDFs",
    ],
  },
  {
    id: "pro",
    nombre: "Pro",
    precio: 19,
    periodo: "mes",
    descripcion: "Para quienes van en serio con sus objetivos.",
    caracteristicas: [
      "Todo lo del plan Básico",
      "Rutinas ilimitadas",
      "Acceso a todos los PDFs",
      "Seguimiento de progreso",
      "Soporte prioritario",
    ],
    destacado: true,
    badge: "Más popular",
  },
  {
    id: "elite",
    nombre: "Elite",
    precio: 39,
    periodo: "mes",
    descripcion: "La experiencia premium completa.",
    caracteristicas: [
      "Todo lo del plan Pro",
      "Sesiones de coaching 1:1",
      "Plan nutricional personalizado",
      "Acceso anticipado a nuevas funciones",
      "Comunidad privada",
    ],
  },
]
