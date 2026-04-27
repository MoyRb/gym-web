import type { RecursoCategoria } from "@/types"
import type { ResourceSeed } from "../resources-content/base-resources"
import type { PdfResourceContent, PdfSection } from "../types"

type CategoryGuide = {
  objective: string
  audience: string
  practicalBlocks: string[]
  commonErrors: string[]
  checklist: string[]
  actionSummary: string
}

const CATEGORY_GUIDES: Record<Exclude<RecursoCategoria, "rutinas">, CategoryGuide> = {
  calentamiento: {
    objective: "Elevar temperatura corporal, activar patrones y mejorar calidad de la sesión principal.",
    audience: "Personas que entrenan fuerza, cardio o sesiones mixtas y quieren llegar listas al primer set útil.",
    practicalBlocks: ["2-3 min de movilidad dinámica global", "3-4 min de activación específica", "2-3 min de aproximación al gesto principal"],
    commonErrors: ["Saltar directo al ejercicio pesado", "Hacer estiramientos pasivos largos antes de fuerza máxima", "Fatigarse durante el calentamiento"],
    checklist: ["Pulso elevado de forma gradual", "Articulaciones principales con rango cómodo", "Primer set de trabajo se siente técnico y estable"],
    actionSummary: "Dedica entre 6 y 12 minutos y adapta el calentamiento a la sesión del día.",
  },
  movilidad: {
    objective: "Mejorar rango activo útil para entrenar con control y menor compensación.",
    audience: "Personas con rigidez en hombro, cadera o tobillo, o con técnica limitada por movilidad.",
    practicalBlocks: ["Evaluación rápida del rango limitado", "Movilidad activa asistida 6-10 min", "Integración al patrón entrenado"],
    commonErrors: ["Rebotar en rangos dolorosos", "Hacer movilidad sin control respiratorio", "No transferir a ejercicios reales"],
    checklist: ["Respiración nasal estable", "Rango mayor sin dolor agudo", "Mejor postura en sentadilla/press/remo"],
    actionSummary: "Menos cantidad y más calidad: 8-12 minutos bien ejecutados son suficientes.",
  },
  cardio: {
    objective: "Mejorar capacidad cardiovascular y recuperación entre series de fuerza.",
    audience: "Usuarios que buscan bajar grasa, mejorar resistencia o sostener más volumen semanal.",
    practicalBlocks: ["Sesión continua en zona moderada", "Sesión intervalada controlada", "Revisión de fatiga y pulsaciones"],
    commonErrors: ["Hacer todo en intensidad alta", "No ajustar cardio cuando aumenta carga de pierna", "No progresar volumen semanal"],
    checklist: ["2-4 sesiones semanales planificadas", "RPE registrado", "Sin impacto negativo fuerte en fuerza"],
    actionSummary: "Combina cardio suave y bloques intensos para progresar sin quemarte.",
  },
  nutricion_basica: {
    objective: "Sostener adherencia nutricional con decisiones simples y repetibles.",
    audience: "Personas activas que necesitan comer mejor sin planes complejos.",
    practicalBlocks: ["Plato base por comida", "Distribución de proteína diaria", "Hidratación y pre/post entreno"],
    commonErrors: ["Comer muy poco proteína", "Improvisar todas las comidas", "No hidratarse durante entrenos largos"],
    checklist: ["Proteína en 3-5 tomas", "Verduras en 2+ comidas", "Agua suficiente durante el día"],
    actionSummary: "Empieza con 2-3 hábitos clave y repítelos cada semana.",
  },
  recuperacion: {
    objective: "Mejorar recuperación para sostener carga y reducir estancamientos.",
    audience: "Personas con fatiga acumulada, sueño irregular o caídas de rendimiento.",
    practicalBlocks: ["Higiene de sueño", "Movilidad y descarga ligera", "Monitoreo de fatiga"],
    commonErrors: ["Ignorar señales de sobrecarga", "Confundir cansancio con falta de disciplina", "No usar semanas de descarga"],
    checklist: ["Sueño consistente", "Dolor muscular manejable", "Rendimiento estable semana a semana"],
    actionSummary: "Recuperar mejor te permite entrenar más y mejor en el largo plazo.",
  },
  principiantes: {
    objective: "Construir base técnica y hábitos para progresar sin lesiones evitables.",
    audience: "Personas en sus primeros meses de gimnasio o que retoman después de pausa larga.",
    practicalBlocks: ["Aprender patrones básicos", "Elegir cargas con RIR", "Registro simple de progreso"],
    commonErrors: ["Copiar rutinas avanzadas", "Subir peso cada sesión sin criterio", "No practicar técnica"],
    checklist: ["Técnica estable en básicos", "3-4 sesiones consistentes", "Progreso en repeticiones/cargas"],
    actionSummary: "Prioriza hacer lo básico muy bien durante 8-12 semanas.",
  },
  nutricion: { objective: "", audience: "", practicalBlocks: [], commonErrors: [], checklist: [], actionSummary: "" },
  entrenamiento: { objective: "", audience: "", practicalBlocks: [], commonErrors: [], checklist: [], actionSummary: "" },
  motivacion: { objective: "", audience: "", practicalBlocks: [], commonErrors: [], checklist: [], actionSummary: "" },
}

const SLUG_SECTIONS: Record<string, PdfSection[]> = {
  "calentamiento-general-10-minutos": [
    {
      heading: "Protocolo completo (10 minutos)",
      body: ["Min 0-3: movilidad dinámica (tobillo, cadera, dorsal).", "Min 3-6: activación de core y escápulas.", "Min 6-10: series de aproximación del primer ejercicio."],
      checklist: ["Sentadilla aérea x10", "Círculos escapulares x12", "Puente de glúteo x12", "2 series de aproximación progresivas"],
    },
  ],
  "cardio-por-zonas-principiantes": [
    {
      heading: "Guía práctica por zonas (RPE)",
      body: ["Zona suave (RPE 4-5): puedes hablar frases completas.", "Zona moderada (RPE 6-7): conversación entrecortada.", "Zona alta (RPE 8): intervalos cortos y controlados."],
      checklist: ["Semana tipo: 2 sesiones zona suave + 1 sesión intervalada", "Progresión: +5 min semanales hasta 40-45 min", "Deload cardio cada 4-6 semanas"],
    },
  ],
  "nutricion-basica-para-entrenar": [
    {
      heading: "Plantilla de alimentación diaria",
      body: ["Comida 1: proteína + carbohidrato + fruta.", "Comida 2: proteína + verduras + grasa saludable.", "Pre-entreno: snack fácil de digerir 60-90 min antes.", "Post-entreno: proteína + carbohidrato para recuperar."],
      checklist: ["Proteína objetivo: 1.6-2.2 g/kg/día", "Agua: 30-40 ml/kg/día", "80% de comidas basadas en alimentos poco procesados"],
    },
  ],
  "recuperacion-post-entreno": [
    {
      heading: "Protocolo de recuperación en 24 horas",
      body: ["0-2h: rehidrata y consume comida con proteína.", "2-8h: movilidad suave de 6-10 min y caminata ligera.", "Noche: prioriza 7-9h de sueño con horario constante."],
      checklist: ["Dolor muscular tolerable", "Sin rigidez extrema al día siguiente", "Energía adecuada para la siguiente sesión"],
    },
  ],
  "guia-inicio-4-semanas": [
    {
      heading: "Ruta de inicio (4 semanas)",
      body: ["Semana 1: aprender técnica y ritmo de sesión.", "Semana 2: consolidar rangos de movimiento.", "Semana 3: aumentar repeticiones manteniendo técnica.", "Semana 4: subir carga mínima en 2-3 ejercicios."],
      checklist: ["3 sesiones por semana", "Bitácora de entreno completada", "Sin dolor agudo durante ejecución"],
    },
  ],
}

export function buildGeneralPdfResource(seed: ResourceSeed): PdfResourceContent {
  const guide = CATEGORY_GUIDES[seed.category as Exclude<RecursoCategoria, "rutinas">]

  return {
    slug: seed.slug,
    title: seed.title,
    category: seed.category,
    description: seed.description,
    objective: guide.objective,
    sections: [
      {
        heading: "Para quién sirve y objetivo del recurso",
        body: [guide.audience, `Objetivo práctico: ${guide.objective}`],
      },
      {
        heading: "Instrucciones prácticas",
        body: ["Aplica este recurso 2-4 veces por semana según tu plan de entrenamiento.", `Bloques recomendados: ${guide.practicalBlocks.join(" · ")}.`],
        checklist: seed.focus,
      },
      ...(SLUG_SECTIONS[seed.slug] ?? []),
      {
        heading: "Errores comunes y checklist final",
        body: ["Evita estos errores para mantener resultados consistentes."],
        checklist: [...guide.commonErrors, ...guide.checklist],
      },
      {
        heading: "Resumen accionable",
        body: [guide.actionSummary, "Aplica durante 2 semanas, revisa sensaciones y ajusta una sola variable a la vez."],
      },
    ],
    recommendations: [
      "Sé consistente antes de buscar más complejidad.",
      "Registra 2 métricas simples: cumplimiento semanal y energía percibida.",
      "Advertencia de sentido común: si un ejercicio causa dolor agudo, reduce intensidad o detén ese movimiento.",
    ],
  }
}
