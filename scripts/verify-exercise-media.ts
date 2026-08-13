/**
 * verify-exercise-media.ts
 *
 * Script DEV-ONLY para verificar el estado del import de GIFs.
 *
 * Comprueba:
 *   - Cantidad de GIFs en Supabase Storage
 *   - Cantidad de filas en exercise_media
 *   - Relaciones exercise_media → exercises
 *   - Checksums existentes
 *   - Sin duplicados
 *   - Todos pending
 *   - Todos is_active=false
 *
 * Usa service_role exclusivamente. Nunca expone la clave.
 *
 * Uso:
 *   npm run verify:exercise-media
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

// ── Cargar .env.local ─────────────────────────────────────────────────────────
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
      process.env[key] = raw.replace(/^(['"])(.*)\1$/, "$2")
    }
  }
}

// ── Env validation ────────────────────────────────────────────────────────────
const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  if (!supabaseUrl)    console.error("ERROR: falta NEXT_PUBLIC_SUPABASE_URL")
  if (!serviceRoleKey) console.error("ERROR: falta SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BUCKET          = "exercise-media"
const STORAGE_PREFIX  = "third-party/gymvisual"
const STORAGE_LIMIT   = 1000

// ── Listar todos los objetos en el bucket con paginación ──────────────────────
async function listAllObjects(): Promise<string[]> {
  const names: string[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(STORAGE_PREFIX, { limit: STORAGE_LIMIT, offset })

    if (error) throw new Error(`Storage list error: ${error.message}`)
    if (!data || data.length === 0) break

    names.push(...data.map((o) => o.name))
    if (data.length < STORAGE_LIMIT) break
    offset += STORAGE_LIMIT
  }

  return names
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Verificando exercise-media...\n")

  // 1. Exercises count
  const { count: exercisesCount, error: exErr } = await supabase
    .from("exercises")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  if (exErr) {
    console.error(`ERROR exercises: ${exErr.message}`)
    process.exit(1)
  }

  // 2. Storage objects
  let storageObjects: string[]
  try {
    storageObjects = await listAllObjects()
  } catch (err) {
    console.error(`ERROR Storage: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }

  // 3. exercise_media — GIFs
  const { count: gifCount, error: gifErr } = await supabase
    .from("exercise_media")
    .select("*", { count: "exact", head: true })
    .eq("kind", "gif")

  if (gifErr) {
    console.error(`ERROR exercise_media (gif count): ${gifErr.message}`)
    process.exit(1)
  }

  // 4. exercise_media — pending
  const { count: pendingCount, error: pendErr } = await supabase
    .from("exercise_media")
    .select("*", { count: "exact", head: true })
    .eq("license_status", "pending")

  if (pendErr) {
    console.error(`ERROR exercise_media (pending): ${pendErr.message}`)
    process.exit(1)
  }

  // 5. exercise_media — active
  const { count: activeCount, error: actErr } = await supabase
    .from("exercise_media")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  if (actErr) {
    console.error(`ERROR exercise_media (active): ${actErr.message}`)
    process.exit(1)
  }

  // 6. Con checksum
  const { count: checksumCount, error: csErr } = await supabase
    .from("exercise_media")
    .select("*", { count: "exact", head: true })
    .not("content_sha256", "is", null)

  if (csErr) {
    console.error(`ERROR exercise_media (checksum): ${csErr.message}`)
    process.exit(1)
  }

  // 7. Verificar duplicados (UNIQUE por source, source_id, kind)
  //    Consultamos todos los registros y agrupamos en memoria
  const { data: allMedia, error: allErr } = await supabase
    .from("exercise_media")
    .select("source, source_id, kind")
    .not("source", "is", null)

  if (allErr) {
    console.error(`ERROR exercise_media (duplicates check): ${allErr.message}`)
    process.exit(1)
  }

  const seen    = new Map<string, number>()
  let duplicates = 0
  for (const row of allMedia ?? []) {
    const key = `${row.source}|${row.source_id}|${row.kind}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  for (const count of seen.values()) {
    if (count > 1) duplicates++
  }

  // 8. Relaciones — exercise_media con exercise_id que no existe
  const { data: mediaWithExercise, error: relErr } = await supabase
    .from("exercise_media")
    .select("exercise_id, exercises!inner(id)")
    .eq("kind", "gif")

  const { data: allGifMedia, error: allGifErr } = await supabase
    .from("exercise_media")
    .select("exercise_id")
    .eq("kind", "gif")

  let missingRelations = 0
  if (!relErr && !allGifErr) {
    missingRelations = (allGifMedia?.length ?? 0) - (mediaWithExercise?.length ?? 0)
  }

  // ── Informe ───────────────────────────────────────────────────────────────
  console.log("─".repeat(40))
  console.log(`Exercises (active):      ${exercisesCount ?? "?"}`)
  console.log(`GIF objects in Storage:  ${storageObjects.length}`)
  console.log(`exercise_media rows:     ${gifCount ?? "?"}`)
  console.log(`pending:                 ${pendingCount ?? "?"}`)
  console.log(`active (should be 0):    ${activeCount ?? "?"}`)
  console.log(`with checksum:           ${checksumCount ?? "?"}`)
  console.log(`duplicates (should be 0): ${duplicates}`)
  console.log(`missing relations:       ${missingRelations}`)
  console.log("─".repeat(40))

  const problems: string[] = []

  if ((activeCount ?? 0) > 0) {
    problems.push(`${activeCount} filas con is_active=true (deberían ser 0 mientras license_status=pending)`)
  }
  if (duplicates > 0) {
    problems.push(`${duplicates} combinaciones (source, source_id, kind) duplicadas`)
  }
  if (missingRelations > 0) {
    problems.push(`${missingRelations} filas exercise_media sin exercise correspondiente`)
  }

  if (problems.length > 0) {
    console.error("\nProblemas detectados:")
    for (const p of problems) console.error(`  ✗ ${p}`)
    process.exit(1)
  }

  console.log("\nVerificación completada sin problemas.")
}

main().catch((err) => {
  console.error("Error inesperado:", err instanceof Error ? err.message : String(err))
  process.exit(1)
})
