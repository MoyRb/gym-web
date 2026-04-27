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
      heading: "Secuencia real de calentamiento (10 minutos)",
      body: [
        "Bloque 1 (min 0-3): movilidad dinámica — 45 s por ejercicio (tobillo en pared, 90/90 de cadera, extensión torácica sobre banco, bisagra con brazos al frente).",
        "Bloque 2 (min 3-6): activación — 2 rondas de puente de glúteo x10, bird-dog x6 por lado y wall slides x10.",
        "Bloque 3 (min 6-8): patrón principal — sentadilla aérea x10 + bisagra con pausa x8 + remo con banda x12.",
        "Bloque 4 (min 8-10): aproximación específica — 2 series del primer ejercicio (40-60% y 65-75% de la carga de trabajo).",
      ],
      checklist: [
        "Pulso sube de forma gradual sin fatiga excesiva.",
        "Primer set útil se siente técnicamente estable.",
        "No hay dolor agudo ni rigidez limitante en rango principal.",
      ],
    },
    {
      heading: "Errores comunes + checklist rápido pre-sesión",
      body: [
        "Error #1: hacer estiramientos pasivos largos antes de fuerza pesada.",
        "Error #2: convertir el calentamiento en cardio intenso y llegar fatigado al bloque principal.",
        "Error #3: omitir las series de aproximación del primer básico del día.",
      ],
      checklist: ["¿Moviste tobillo, cadera, dorsal y escápulas?", "¿Activaste core/glúteo al menos 2 rondas?", "¿Hiciste 1-2 series de aproximación?"],
    },
  ],
  "activacion-dia-de-pierna": [
    {
      heading: "Activación previa para pierna (8-12 min)",
      body: [
        "Movilidad inicial: dorsiflexión en pared 2x8/lado + aductor rock-back 2x8/lado.",
        "Activación: monster walks 2x12 pasos + puente de glúteo 2x10 con pausa de 2 s.",
        "Integración: sentadilla goblet ligera 2x8 + zancada reversa 1x8/lado antes de la primera serie pesada.",
      ],
      checklist: ["Rodilla estable en apoyo monopodal.", "Mayor profundidad sin colapso de tronco.", "Glúteo activo en fase de subida."],
    },
  ],
  "activacion-hombro-escapulas": [
    {
      heading: "Protocolo hombro/escápulas (7-10 min)",
      body: [
        "Ronda 1: band pull-aparts x15 + face pulls x12 + rotación externa con banda x12/lado.",
        "Ronda 2: wall slides x10 + scap push-up x10 + press ligero por encima de la cabeza x8.",
        "Antes de press o dominadas: 2 series de aproximación con foco en depresión y rotación escapular.",
      ],
      checklist: ["No hay pinchazo en arco de elevación.", "Escápulas se mueven sin compensar con lumbar.", "Primer press se siente estable."],
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
      heading: "Plantilla diaria práctica",
      body: [
        "Desayuno/comida 1: 25-40 g de proteína + carbohidrato principal (avena/pan/arroz) + fruta.",
        "Comida central: 1/2 plato verduras, 1/4 proteína magra, 1/4 carbohidrato; añade grasa saludable en porción de pulgar.",
        "Pre-entreno (60-90 min): snack de fácil digestión (yogur + banana, tostada con pavo, o batido + fruta).",
        "Post-entreno (0-2 h): 25-40 g de proteína + carbohidrato para recuperación de glucógeno.",
      ],
      checklist: ["Proteína objetivo: 1.6-2.2 g/kg/día", "Hidratación: 30-40 ml/kg/día + 500-750 ml durante entreno largo", "Preparación semanal: deja 2 comidas base listas"],
    },
  ],
  "intervalos-controlados-bicicleta": [
    {
      heading: "Protocolo de intervalos en bicicleta",
      body: [
        "Duración total: 28-36 min incluyendo calentamiento y vuelta a la calma.",
        "Calentamiento: 8 min progresivos (RPE 3 → 6) con 2 aceleraciones de 20 s.",
        "Bloque principal opción A (1:1): 8-10 repeticiones de 60 s fuerte (RPE 8) + 60 s suave (RPE 3-4).",
        "Bloque principal opción B (1:2): 6-8 repeticiones de 75 s fuerte (RPE 8) + 150 s suave (RPE 3).",
        "Vuelta a la calma: 5 min suaves + 2 min respiración nasal.",
      ],
      checklist: ["Cadencia objetivo en tramo fuerte: 90-105 rpm.", "Si no mantienes potencia en 2 intervalos seguidos, corta 1-2 repeticiones.", "Progresión semanal: +1 repetición o +5 s por tramo fuerte."],
    },
  ],
  "sueno-y-rendimiento-fisico": [
    {
      heading: "Optimiza sueño y recuperación",
      body: [
        "Ventana de sueño: define horario fijo con variación máxima de 30-45 minutos entre días.",
        "Rutina pre-sueño (45 min): bajar luces, cortar pantallas intensas, ducha tibia breve o respiración diafragmática 4-6 min.",
        "Cafeína: evita consumo 8-10 horas antes de dormir; alcohol y comidas muy pesadas en las 2 horas previas reducen calidad del descanso.",
      ],
      checklist: ["Objetivo semanal: 7-9 h promedio por noche.", "Despertar con energía en al menos 4/7 días.", "Si hay fatiga alta 2+ días, reduce volumen de entrenamiento 20-30% temporalmente."],
    },
  ],
  "guia-inicio-4-semanas": [
    {
      heading: "Guía inicial · primer mes en gimnasio",
      body: [
        "Semana 1: aprende patrones base (sentadilla, bisagra, empuje, tracción) con RIR 3.",
        "Semana 2: repite estructura y suma 1 serie en 1-2 ejercicios clave.",
        "Semana 3: sube repeticiones dentro del rango objetivo manteniendo técnica.",
        "Semana 4: aumenta carga 2-5% en ejercicios dominados y consolida hábitos de sueño/nutrición.",
      ],
      checklist: ["3 sesiones/semana completadas.", "Registro de cargas y repeticiones en cada sesión.", "Cero dolor agudo y mejor control técnico."],
    },
  ],
  "recuperacion-post-entreno": [
    {
      heading: "Protocolo de recuperación en 24 horas",
      body: ["0-2h: rehidrata y consume comida con proteína.", "2-8h: movilidad suave de 6-10 min y caminata ligera.", "Noche: prioriza 7-9h de sueño con horario constante."],
      checklist: ["Dolor muscular tolerable", "Sin rigidez extrema al día siguiente", "Energía adecuada para la siguiente sesión"],
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
