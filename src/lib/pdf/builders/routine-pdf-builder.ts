import type { ResourceSeed } from "../resources-content/base-resources"
import { ROUTINE_RESOURCE_MAP } from "../resources-content/routine-template-snapshots"
import type { PdfResourceContent, PdfSection } from "../types"

const GOAL_LABEL: Record<string, string> = {
  ganar_masa_muscular: "Ganar masa muscular",
  bajar_grasa: "Bajar grasa",
  mejorar_resistencia: "Mejorar resistencia",
  mejorar_condicion_general: "Mejorar condición general",
}

const ROUTINE_SPECIAL_SLUGS = new Set(["progresion-cargas-8-semanas", "checklist-semanal-entrenamiento"])

export function hasRoutineSnapshot(slug: string) {
  return Boolean(ROUTINE_RESOURCE_MAP[slug])
}

export function hasRoutineSpecificContent(slug: string) {
  return hasRoutineSnapshot(slug) || ROUTINE_SPECIAL_SLUGS.has(slug)
}

function buildRoutineSections(slug: string): PdfSection[] {
  const routine = ROUTINE_RESOURCE_MAP[slug]
  if (!routine) return []

  const weeklyStructure = routine.dias.map((day) => `${day.nombre_dia}: ${day.enfoque}`)

  const daySections = routine.dias.map<PdfSection>((day) => ({
    heading: day.nombre_dia,
    body: [
      `Enfoque: ${day.enfoque}`,
      day.notas ? `Nota del día: ${day.notas}` : "Mantén técnica limpia y ritmo de sesión constante.",
    ],
    checklist: day.ejercicios.map((exercise) => {
      const notes = exercise.notas ? ` · Técnica: ${exercise.notas}` : ""
      return `${exercise.nombre} — ${exercise.series} series x ${exercise.repeticiones} · Descanso ${exercise.descanso}${notes}`
    }),
  }))

  return [
    {
      heading: "Ficha de la rutina",
      body: [
        `Objetivo principal: ${GOAL_LABEL[routine.objetivo] ?? routine.objetivo}.`,
        `Nivel: ${routine.level_label} (${routine.experiencia}).`,
        `Frecuencia: ${routine.dias_por_semana} días por semana durante ${routine.duracion_semanas} semanas.`,
        `Duración estimada por sesión: ${routine.estimated_session_minutes} minutos.`,
      ],
      checklist: routine.focus_areas.map((focus) => `Foco: ${focus}`),
    },
    {
      heading: "Instrucciones generales",
      body: [
        "Registra carga, repeticiones reales y RPE/RIR al final de cada ejercicio principal.",
        "Trabaja con técnica estable; si una repetición cambia la técnica, detén la serie ahí.",
        "Usa esta guía con una distribución semanal fija (por ejemplo: lun-mar-jue-vie-sáb en rutina de 5 días).",
      ],
      checklist: [
        "Calentamiento recomendado: 8-12 minutos (movilidad dinámica + activación específica).",
        "Series de aproximación: 1-3 series crecientes en el primer ejercicio pesado.",
        "Vuelta a la calma: 5-8 minutos de respiración nasal y movilidad suave.",
      ],
    },
    {
      heading: "Estructura semanal sugerida",
      body: [
        "Distribuye días de mayor fatiga con al menos 24h entre estímulos similares.",
        "Si faltas a una sesión, retoma el siguiente día del plan en lugar de duplicar volumen.",
      ],
      checklist: weeklyStructure,
    },
    ...daySections,
    {
      heading: "Progresión y recuperación",
      body: [
        "Aplica doble progresión: primero completa el rango alto de repeticiones y luego aumenta carga 2-5%.",
        "Mantén 1-3 repeticiones en reserva en ejercicios base; reserva el fallo para accesorios puntuales.",
      ],
      checklist: [
        ...(routine.recomendaciones_generales ?? []),
        "Si dos sesiones seguidas bajan en rendimiento, reduce 20-30% del volumen por 4-7 días.",
        "Advertencia de sentido común: detén cualquier ejercicio si aparece dolor agudo o pérdida de control técnico.",
      ],
    },
  ]
}

export function buildRoutinePdfResource(seed: ResourceSeed): PdfResourceContent | null {
  const routine = ROUTINE_RESOURCE_MAP[seed.slug]

  if (!routine && !ROUTINE_SPECIAL_SLUGS.has(seed.slug)) {
    return null
  }

  if (routine) {
    return {
      slug: seed.slug,
      title: seed.title,
      category: seed.category,
      description: seed.description,
      objective: `${GOAL_LABEL[routine.objetivo] ?? routine.objetivo} con planificación ${routine.dias_por_semana} días/semana`,
      sections: buildRoutineSections(seed.slug),
      recommendations: [
        "Revisa tu bitácora semanal para decidir ajustes con datos (no por impulso).",
        "Mantén hidratación y sueño como prioridad para sostener progresión.",
        "Usa deload cuando baje el rendimiento y aumente fatiga percibida.",
      ],
    }
  }

  if (seed.slug === "progresion-cargas-8-semanas") {
    return {
      slug: seed.slug,
      title: seed.title,
      category: seed.category,
      description: seed.description,
      objective: "Aplicar una progresión de 8 semanas sin perder técnica ni adherencia",
      sections: [
        {
          heading: "Protocolo de progresión por bloques",
          body: [
            "Semanas 1-2: selecciona cargas con 2-3 RIR en básicos y 1-2 RIR en accesorios.",
            "Semanas 3-4: aumenta 1-2 repeticiones por serie manteniendo ejecución estable.",
            "Semanas 5-6: sube carga 2-5% en los ejercicios donde llegaste al tope de repeticiones.",
            "Semana 7: mantén carga y busca calidad técnica (sin empujar al fallo).",
            "Semana 8: semana puente, reduce volumen 25% para consolidar y preparar siguiente bloque.",
          ],
          checklist: ["Registra RIR al terminar cada serie principal.", "No subas carga si acortas rango de movimiento.", "Prioriza constancia: 8 semanas completas > 2 semanas intensas."],
        },
      ],
      recommendations: ["Compara repeticiones totales semanales por patrón (empuje, tracción, pierna).", "Si te estancas 2 semanas, ajusta sueño, estrés y distribución de descanso antes de cambiar toda la rutina."],
    }
  }

  return {
    slug: seed.slug,
    title: seed.title,
    category: seed.category,
    description: seed.description,
    objective: "Convertir tu semana de entrenamiento en un sistema de seguimiento accionable",
    sections: [
      {
        heading: "Checklist semanal FITNESS CLUB",
        body: ["Usa este control cada domingo para decidir carga de la semana siguiente.", "Puntúa cada ítem de 1 a 5 y actúa sobre los puntos más bajos."],
        checklist: [
          "Asistencia: ¿cumpliste al menos 90% de sesiones planificadas?",
          "Sueño: promedio de 7-9 horas con horario estable.",
          "Hidratación: 30-40 ml/kg/día + reposición durante entreno.",
          "Rendimiento: ¿subiste repeticiones o carga en 2-3 ejercicios clave?",
          "Recuperación: dolor muscular y fatiga compatibles con seguir progresando.",
        ],
      },
      {
        heading: "Reglas de decisión rápida",
        body: ["Si tu puntaje total es 22-25, continúa progresión normal.", "Si está entre 18-21, mantén cargas y mejora recuperación.", "Si es menor de 18, aplica microdescarga de 4-7 días."],
      },
    ],
    recommendations: ["Haz este cierre semanal en menos de 10 minutos.", "La mejor rutina es la que puedes repetir con buena técnica y energía."],
  }
}
