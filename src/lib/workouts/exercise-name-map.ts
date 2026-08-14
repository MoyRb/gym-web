/**
 * exercise-name-map.ts
 *
 * Mapeo controlado de nombres en español (tal como aparecen en routine_templates.routine_data)
 * a candidatos en inglés para buscar contra public.exercises (dataset hasaneyldrm).
 *
 * LAS CLAVES son los nombres del seed SQL normalizados (lowercase + trim).
 * LOS CANDIDATOS son los nombres EXACTOS (case-insensitive) del dataset.
 *
 * Validado contra el dataset real local. Ver QA CORTE 2C para cobertura completa.
 *
 * Nota sobre el dataset:
 *   "sled 45в° leg press" contiene el carácter cirílico "в°" (del dataset original).
 *   Se preserva tal cual para que el ilike funcione contra los datos reales.
 *
 * Ejercicios genuinamente NO mapeables (excluidos en KNOWN_UNMAPPABLE):
 *   - "hip thrust" / "face pull": no existen en el dataset hasaneyldrm
 *   - Cardio, movilidad, circuitos compuestos: no son ejercicios individuales de gym
 */

/** Mapeo: nombre_en_template_normalizado → candidatos_en_inglés_en_orden_de_preferencia */
export const EXERCISE_NAME_MAP: Readonly<Record<string, readonly string[]>> = {

  // ── Sentadillas ───────────────────────────────────────────────────────────
  // Dataset tiene "barbell full squat" y "dumbbell goblet squat"
  "sentadilla goblet o trasera":        ["barbell full squat", "dumbbell goblet squat"],
  "sentadilla goblet ligera":           ["dumbbell goblet squat", "barbell full squat"],
  "sentadilla trasera o en multipower": ["barbell full squat"],
  "sentadilla trasera o multipower":    ["barbell full squat"],
  "sentadilla":                         ["barbell full squat"],
  // Dataset tiene "barbell single leg split squat" (no "bulgarian split squat")
  "sentadilla búlgara":                 ["barbell single leg split squat"],

  // ── Press de pecho ────────────────────────────────────────────────────────
  // Dataset tiene "barbell bench press", "dumbbell incline bench press", "barbell incline bench press"
  "press de banca o mancuernas":        ["barbell bench press"],
  "press de banca":                     ["barbell bench press"],
  "press banca":                        ["barbell bench press"],
  "press inclinado en máquina":         ["dumbbell incline bench press", "barbell incline bench press"],
  "press inclinado con mancuernas":     ["dumbbell incline bench press"],
  "press inclinado mancuernas":         ["dumbbell incline bench press"],
  "press inclinado":                    ["barbell incline bench press", "dumbbell incline bench press"],
  "press máquina":                      ["barbell bench press"],

  // ── Press de hombros ──────────────────────────────────────────────────────
  // Dataset tiene "barbell seated overhead press"
  "press militar sentado":              ["barbell seated overhead press"],

  // ── Remo / Espalda ────────────────────────────────────────────────────────
  "remo con mancuerna o polea":         ["dumbbell bent over row", "cable seated row"],
  "remo con barra o t-bar":             ["barbell bent over row"],
  "remo con barra":                     ["barbell bent over row"],
  "remo barra":                         ["barbell bent over row"],
  "remo pecho apoyado":                 ["dumbbell incline row", "barbell incline row"],
  "remo en polea baja":                 ["cable seated row"],
  // "remo con banda" → no hay resistance band row en el dataset → KNOWN_UNMAPPABLE

  // ── Jalón ─────────────────────────────────────────────────────────────────
  // Dataset tiene "cable pulldown" y "twin handle parallel grip lat pulldown"
  "jalón al pecho":                     ["cable pulldown", "cable lat pulldown full range of motion"],
  // "neutral grip lat pulldown" no existe → usar "twin handle parallel grip lat pulldown"
  "jalón agarre neutro":                ["twin handle parallel grip lat pulldown", "cable pulldown"],

  // ── Peso muerto ───────────────────────────────────────────────────────────
  "peso muerto rumano":                 ["barbell romanian deadlift"],
  "peso muerto con barra hexagonal":    ["barbell deadlift"],
  "peso muerto barra hexagonal":        ["barbell deadlift"],

  // ── Pierna ────────────────────────────────────────────────────────────────
  // Dataset tiene "sled 45в° leg press" (carácter cirílico del dataset original)
  "prensa inclinada":                   ["sled 45\u0432\u00b0 leg press", "lever alternate leg press"],
  "prensa":                             ["sled 45\u0432\u00b0 leg press", "lever alternate leg press"],
  "zancadas caminando":                 ["walking lunge", "barbell walking lunge"],
  // Dataset tiene "lever lying leg curl"
  "curl femoral en máquina":            ["lever lying leg curl", "cable assisted inverse leg curl"],
  "curl femoral":                       ["lever lying leg curl", "cable assisted inverse leg curl"],
  // Dataset tiene "barbell standing calf raise"
  "elevación de gemelos":               ["barbell standing calf raise", "sled 45\u0432\u00b0 calf press"],
  "gemelos":                            ["barbell standing calf raise", "sled 45\u0432\u00b0 calf press"],

  // ── Cadera / Glúteo ───────────────────────────────────────────────────────
  // Dataset NO tiene "barbell hip thrust" → usar "barbell glute bridge" como alternativa más cercana
  "hip thrust":                         ["barbell glute bridge"],
  "puente de glúteo":                   ["barbell glute bridge", "glute bridge march"],

  // ── Hombros / Accesorios ──────────────────────────────────────────────────
  "elevaciones laterales":              ["dumbbell lateral raise"],
  // "face pull" / "cable face pull" NO existe en el dataset → KNOWN_UNMAPPABLE
  // "pallof press" NO existe como cable → usar versión con banda
  "pallof press":                       ["band horizontal pallof press", "band vertical pallof press"],

  // ── Brazos ────────────────────────────────────────────────────────────────
  // Dataset tiene "ez barbell curl"
  "curl de bíceps con barra z":         ["ez barbell curl"],
  "curl barra z":                       ["ez barbell curl"],
  // Dataset tiene "cable pushdown (with rope attachment)"
  "extensión de tríceps en cuerda":     ["cable pushdown (with rope attachment)", "cable pushdown"],
  // Dataset tiene "bench dip (knees bent)"
  "fondos asistidos o en banco":        ["bench dip (knees bent)", "assisted triceps dip (kneeling)"],
  "fondos asistidos":                   ["bench dip (knees bent)", "assisted triceps dip (kneeling)"],
  // Dataset tiene "dumbbell hammer curl"
  "curl martillo + tríceps cuerda":     ["dumbbell hammer curl"],

  // ── Core ──────────────────────────────────────────────────────────────────
  // Dataset tiene "front plank with twist"
  "plancha frontal":                    ["front plank with twist"],
  // Dataset tiene "bodyweight incline side plank" y "dumbbell side plank with rear fly"
  "plancha lateral":                    ["bodyweight incline side plank"],
  "dead bug":                           ["dead bug"],

  // ── Acondicionamiento / Funcional ─────────────────────────────────────────
  "air bike":                           ["air bike"],
  // Dataset tiene "farmers walk" (con s)
  "farmer carry":                       ["farmers walk"],
}

/**
 * Normaliza el nombre de un ejercicio del template para usar como clave en EXERCISE_NAME_MAP.
 * Solo lowercase + trim. Sin transliteración ni fuzzy.
 */
export function normalizeTemplateName(name: string): string {
  return name.toLowerCase().trim()
}

/**
 * Ejercicios que se sabe que NO tienen equivalente en public.exercises.
 * Son cardio genérico, movilidad, circuitos compuestos,
 * o ejercicios ausentes del dataset hasaneyldrm.
 *
 * Se omiten de la resolución sin generar error — son intencionalmente no mapeables.
 *
 * AUSENTES DEL DATASET:
 *   - "face pull" / "hip thrust" (versión barra): no están en hasaneyldrm
 *   - "remo con banda": no hay resistance band row en el dataset
 */
export const KNOWN_UNMAPPABLE: ReadonlySet<string> = new Set([
  // Cardio genérico
  "cardio continuo (cinta, bici o elíptica)",
  "caminata inclinada o bici",
  "intervalos extensivos",
  "intervalos suaves en remo",
  // Movilidad / calentamiento
  "movilidad de cadera y dorsal",
  "movilidad dinámica global",
  "respiración diafragmática",
  // Circuito compuesto (3 ejercicios en 1 nombre)
  "circuito: kettlebell swing + remo trx + sentadilla goblet",
  // Ausentes del dataset hasaneyldrm
  "face pull",
  "remo con banda",
])
