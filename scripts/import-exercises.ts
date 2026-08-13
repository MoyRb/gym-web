/**
 * import-exercises.ts
 *
 * Importa el catálogo de ejercicios desde el dataset hasaneyldrm/exercises-dataset
 * al commit PINNED: 7455efae41b330c265e7cd4b78dfa848e7ce5ebd
 *
 * Solo metadatos e instrucciones bajo MIT.
 * NO se importan imágenes, GIF ni media de Gym Visual.
 *
 * Uso:
 *   npm run import:exercises
 *
 * Variables requeridas (leídas desde .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

// ── Cargar .env.local antes de leer process.env ──────────────────────────────
const envPath = resolve(process.cwd(), ".env.local")
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const raw = trimmed.slice(eqIdx + 1)
    if (key && !(key in process.env)) {
      // Eliminar comillas envolventes si existen
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2")
    }
  }
}

// ── Constantes ────────────────────────────────────────────────────────────────
const SOURCE = "hasaneyldrm/exercises-dataset"
const PINNED_COMMIT = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd"
const DATASET_URL =
  `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${PINNED_COMMIT}/data/exercises.json`
const BATCH_SIZE = 100

// ── Validar variables de entorno ──────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  if (!supabaseUrl)    console.error("ERROR: falta NEXT_PUBLIC_SUPABASE_URL")
  if (!serviceRoleKey) console.error("ERROR: falta SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

// ── Cliente Supabase (service_role) ───────────────────────────────────────────
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ── Esquema Zod de validación ─────────────────────────────────────────────────
// Solo campos de metadatos + instrucciones.
// Los campos de media (image, gif_url, media_id, attribution) se ignoran.
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
  // Campos ignorados — listados explícitamente para documentar la exclusión
  category:    z.unknown().optional(),
  media_id:    z.unknown().optional(),
  image:       z.unknown().optional(),
  gif_url:     z.unknown().optional(),
  attribution: z.unknown().optional(),
})

type RawExercise = z.infer<typeof RawExerciseSchema>

// ── Transformar al modelo interno ─────────────────────────────────────────────
function toDbRecord(raw: RawExercise) {
  // instruction_steps: normalizar a objeto si viene como otra estructura
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
    // image, gif_url, media_id, attribution: NO se incluyen
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Obteniendo dataset desde commit ${PINNED_COMMIT}...`)

  const response = await fetch(DATASET_URL)
  if (!response.ok) {
    console.error(`ERROR: fallo al obtener dataset: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const payload = (await response.json()) as unknown
  const sourceArray: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { exercises?: unknown[] }).exercises)
      ? (payload as { exercises: unknown[] }).exercises
      : []

  console.log(`Source records: ${sourceArray.length}`)

  const validated: RawExercise[] = []
  const failed: Array<{ index: number; id: unknown; error: string }> = []

  for (let i = 0; i < sourceArray.length; i++) {
    const result = RawExerciseSchema.safeParse(sourceArray[i])
    if (result.success) {
      validated.push(result.data)
    } else {
      const issue = result.error.issues[0]
      const rawId = (sourceArray[i] as Record<string, unknown>)?.id ?? "(sin id)"
      failed.push({
        index: i,
        id:    rawId,
        error: `${issue.path.join(".")}: ${issue.message}`,
      })
    }
  }

  console.log(`Validated: ${validated.length}`)

  if (failed.length > 0) {
    console.error(`\nFallos de validación (${failed.length}):`)
    for (const f of failed.slice(0, 20)) {
      console.error(`  [${f.index}] id=${f.id} — ${f.error}`)
    }
    if (failed.length > 20) {
      console.error(`  ... y ${failed.length - 20} más`)
    }
    console.error("\nAbortando: existen fallos de validación.")
    process.exit(1)
  }

  // ── Upsert por batches ────────────────────────────────────────────────────
  let imported = 0

  for (let i = 0; i < validated.length; i += BATCH_SIZE) {
    const batch = validated.slice(i, i + BATCH_SIZE).map(toDbRecord)

    const { error } = await supabase
      .from("exercises")
      .upsert(batch, { onConflict: "source,source_id", ignoreDuplicates: false })

    if (error) {
      console.error(`\nERROR en batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      process.exit(1)
    }

    imported += batch.length
    process.stdout.write(`\rImportando... ${imported}/${validated.length}`)
  }

  console.log("\n")
  console.log(`Source records: ${sourceArray.length}`)
  console.log(`Validated:      ${validated.length}`)
  console.log(`Imported:       ${imported}`)
  console.log(`Failed:         ${failed.length}`)
}

main().catch((err) => {
  console.error("Error inesperado:", err instanceof Error ? err.message : String(err))
  process.exit(1)
})
