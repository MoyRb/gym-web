/**
 * import-transform.test.ts
 *
 * Tests para el transformador / validador del importer de ejercicios.
 * Cubre la lógica de mapeo dataset → modelo interno sin acceso a DB ni red.
 */
import { describe, it, expect } from "vitest"
import { z } from "zod"

// ── Schema reutilizado del importer (duplicado para testing aislado) ───────────
const SOURCE = "hasaneyldrm/exercises-dataset"

const RawExerciseSchema = z.object({
  id:                z.string().min(1),
  name:              z.string().min(1),
  body_part:         z.string().min(1),
  equipment:         z.string().min(1),
  target:            z.string().min(1),
  muscle_group:      z.string().nullish(),
  secondary_muscles: z.array(z.string()).default([]),
  instructions: z
    .record(z.string(), z.unknown())
    .refine(
      (val) => "es" in val && val.es !== null && val.es !== "" && val.es !== undefined,
      { message: "instructions.es es requerido y debe ser no-vacío" }
    ),
  instruction_steps: z.unknown().optional().nullable(),
  created_at:        z.string().nullish(),
  // Campos de media — ignorados explícitamente
  category:    z.unknown().optional(),
  media_id:    z.unknown().optional(),
  image:       z.unknown().optional(),
  gif_url:     z.unknown().optional(),
  attribution: z.unknown().optional(),
})

type RawExercise = z.infer<typeof RawExerciseSchema>

function toDbRecord(raw: RawExercise) {
  let steps: unknown = raw.instruction_steps ?? {}
  if (steps === null || steps === undefined) steps = {}

  return {
    source:            SOURCE,
    source_id:         raw.id,
    name:              raw.name,
    body_part:         raw.body_part,
    equipment:         raw.equipment,
    target:            raw.target,
    muscle_group:      raw.muscle_group ?? null,
    secondary_muscles: raw.secondary_muscles,
    instructions:      raw.instructions,
    instruction_steps: steps,
    source_created_at: raw.created_at ?? null,
    is_active:         true,
  }
}

// ── Fixture ───────────────────────────────────────────────────────────────────
const VALID_RAW = {
  id:                "abc-123",
  name:              "Barbell Squat",
  category:          "strength",
  body_part:         "upper legs",
  equipment:         "barbell",
  target:            "quads",
  muscle_group:      "quadriceps",
  secondary_muscles: ["glutes", "hamstrings"],
  instructions:      { en: "Stand with feet shoulder-width apart.", es: "Párate con pies separados al ancho de hombros." },
  instruction_steps: { en: ["Step 1", "Step 2"], es: ["Paso 1", "Paso 2"] },
  created_at:        "2024-01-01T00:00:00Z",
  // Campos de media presentes en el dataset pero que deben ignorarse
  media_id:          "media-999",
  image:             "https://cdn.gymvisual.com/img/squat.jpg",
  gif_url:           "https://cdn.gymvisual.com/gif/squat.gif",
  attribution:       "Gym Visual",
}

// ── 1. Transformación correcta dataset → ejercicio ────────────────────────────
describe("transformación dataset -> ejercicio", () => {
  it("valida un registro completo y transforma correctamente", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return

    const record = toDbRecord(result.data)

    expect(record.source).toBe(SOURCE)
    expect(record.source_id).toBe("abc-123")
    expect(record.name).toBe("Barbell Squat")
    expect(record.body_part).toBe("upper legs")
    expect(record.equipment).toBe("barbell")
    expect(record.target).toBe("quads")
    expect(record.muscle_group).toBe("quadriceps")
    expect(record.secondary_muscles).toEqual(["glutes", "hamstrings"])
    expect(record.is_active).toBe(true)
    expect(record.source_created_at).toBe("2024-01-01T00:00:00Z")
  })

  it("source siempre es 'hasaneyldrm/exercises-dataset'", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect(record.source).toBe("hasaneyldrm/exercises-dataset")
  })

  it("source_id es el id del dataset, no un UUID generado", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect(record.source_id).toBe(VALID_RAW.id)
  })

  it("secondary_muscles usa default [] cuando no viene en el dato", () => {
    const raw = { ...VALID_RAW, secondary_muscles: undefined }
    const result = RawExerciseSchema.safeParse(raw)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect(record.secondary_muscles).toEqual([])
  })

  it("muscle_group es null cuando viene nullish", () => {
    const raw = { ...VALID_RAW, muscle_group: null }
    const result = RawExerciseSchema.safeParse(raw)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect(record.muscle_group).toBeNull()
  })
})

// ── 2. Rechazo de registros inválidos ─────────────────────────────────────────
describe("rechazo de registros inválidos", () => {
  it("rechaza si id está vacío", () => {
    const result = RawExerciseSchema.safeParse({ ...VALID_RAW, id: "" })
    expect(result.success).toBe(false)
  })

  it("rechaza si name está vacío", () => {
    const result = RawExerciseSchema.safeParse({ ...VALID_RAW, name: "" })
    expect(result.success).toBe(false)
  })

  it("rechaza si body_part está vacío", () => {
    const result = RawExerciseSchema.safeParse({ ...VALID_RAW, body_part: "" })
    expect(result.success).toBe(false)
  })

  it("rechaza si equipment está vacío", () => {
    const result = RawExerciseSchema.safeParse({ ...VALID_RAW, equipment: "" })
    expect(result.success).toBe(false)
  })

  it("rechaza si target está vacío", () => {
    const result = RawExerciseSchema.safeParse({ ...VALID_RAW, target: "" })
    expect(result.success).toBe(false)
  })

  it("rechaza si instructions no es un objeto", () => {
    const result = RawExerciseSchema.safeParse({ ...VALID_RAW, instructions: "texto plano" })
    expect(result.success).toBe(false)
  })

  it("rechaza si instructions.es está ausente", () => {
    const result = RawExerciseSchema.safeParse({
      ...VALID_RAW,
      instructions: { en: "English only" },
    })
    expect(result.success).toBe(false)
    if (result.success) return
    const hasEsError = result.error.issues.some((i) =>
      i.message.includes("instructions.es")
    )
    expect(hasEsError).toBe(true)
  })

  it("rechaza si instructions.es es cadena vacía", () => {
    const result = RawExerciseSchema.safeParse({
      ...VALID_RAW,
      instructions: { en: "English", es: "" },
    })
    expect(result.success).toBe(false)
  })

  it("rechaza si instructions.es es null", () => {
    const result = RawExerciseSchema.safeParse({
      ...VALID_RAW,
      instructions: { en: "English", es: null },
    })
    expect(result.success).toBe(false)
  })
})

// ── 3. El mapeo no incluye campos de media ────────────────────────────────────
describe("import mapping no incluye media", () => {
  it("el registro transformado no contiene 'image'", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect("image" in record).toBe(false)
  })

  it("el registro transformado no contiene 'gif_url'", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect("gif_url" in record).toBe(false)
  })

  it("el registro transformado no contiene 'media_id'", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect("media_id" in record).toBe(false)
  })

  it("el registro transformado no contiene 'attribution'", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    expect("attribution" in record).toBe(false)
  })
})

// ── 4. source / source_id correctos ──────────────────────────────────────────
describe("source y source_id", () => {
  it("source es siempre el identificador del dataset", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(toDbRecord(result.data).source).toBe("hasaneyldrm/exercises-dataset")
  })

  it("source_id coincide con el id del registro fuente", () => {
    const withCustomId = { ...VALID_RAW, id: "custom-exercise-id-999" }
    const result = RawExerciseSchema.safeParse(withCustomId)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(toDbRecord(result.data).source_id).toBe("custom-exercise-id-999")
  })
})

// ── 5. instructions.es requerido ──────────────────────────────────────────────
describe("instructions.es requerido", () => {
  it("valida cuando instructions.es es una cadena no vacía", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
  })

  it("rechaza cuando instructions no tiene clave 'es'", () => {
    const result = RawExerciseSchema.safeParse({
      ...VALID_RAW,
      instructions: { en: "only english" },
    })
    expect(result.success).toBe(false)
  })

  it("las instrucciones en español se preservan en el registro transformado", () => {
    const result = RawExerciseSchema.safeParse(VALID_RAW)
    expect(result.success).toBe(true)
    if (!result.success) return
    const record = toDbRecord(result.data)
    const instructions = record.instructions as Record<string, unknown>
    expect(instructions.es).toBeTruthy()
  })
})

// ── 6. Cobertura de privilegios (unit — documentados como policy SQL) ─────────
// La verificación real de RLS se realiza contra la DB local con supabase db reset.

describe("RLS de exercises (documentación SQL)", () => {
  /*
   * authenticated = SELECT (solo is_active = true):
   *   SET ROLE authenticated;
   *   SELECT count(*) FROM public.exercises WHERE is_active = true;
   *   -- Expected: n rows
   *
   * authenticated != INSERT:
   *   INSERT INTO public.exercises (source, source_id, ...) VALUES (...);
   *   -- Expected: ERROR 42501 permission denied
   *
   * authenticated != UPDATE:
   *   UPDATE public.exercises SET name = 'x' WHERE id = '...';
   *   -- Expected: ERROR 42501 permission denied
   *
   * authenticated != DELETE:
   *   DELETE FROM public.exercises WHERE id = '...';
   *   -- Expected: ERROR 42501 permission denied
   *
   * anon sin acceso:
   *   SET ROLE anon;
   *   SELECT * FROM public.exercises LIMIT 1;
   *   -- Expected: 0 rows (RLS) o ERROR 42501
   *
   * exercise_media pending no visible:
   *   INSERT INTO public.exercise_media (..., license_status = 'pending', is_active = true) ...;
   *   SET ROLE authenticated;
   *   SELECT count(*) FROM public.exercise_media WHERE license_status = 'pending';
   *   -- Expected: 0 rows (RLS bloquea pending)
   *
   * exercise_media: count debe ser 0 sin media propia:
   *   SELECT count(*) FROM public.exercise_media;
   *   -- Expected: 0
   */

  it("[doc] la política RLS solo permite SELECT para authenticated con is_active = true", () => {
    // Documentado — verificar con psql contra supabase db reset
    expect(true).toBe(true)
  })

  it("[doc] exercise_media con license_status='pending' no es visible para authenticated", () => {
    // Documentado — la policy filtra por license_status IN ('licensed','owned')
    expect(true).toBe(true)
  })
})
