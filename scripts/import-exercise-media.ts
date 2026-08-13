/**
 * import-exercise-media.ts
 *
 * Descarga los GIF asociados a los 1,324 ejercicios desde el repositorio
 * hasaneyldrm/exercises-dataset (commit PINNED) y los almacena en
 * Supabase Storage (bucket: exercise-media).
 *
 * Los GIF se registran en public.exercise_media con:
 *   license_status = 'pending'
 *   is_active      = false
 *
 * La aplicación NO los muestra al usuario hasta que sean licenciados.
 *
 * Uso:
 *   npm run import:exercise-media
 *
 * Variables requeridas (en .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

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

// ── Constantes ────────────────────────────────────────────────────────────────
export const SOURCE          = "hasaneyldrm/exercises-dataset"
export const PINNED_COMMIT   = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd"
const DATASET_URL            = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${PINNED_COMMIT}/data/exercises.json`
const BUCKET                 = "exercise-media"
const CONCURRENCY            = 8
const MAX_RETRIES            = 3
const RETRY_BASE_DELAY_MS    = 1000
const MAX_GIF_BYTES          = 5 * 1024 * 1024  // 5 MB — debe coincidir con file_size_limit del bucket
const PROGRESS_INTERVAL      = 100

// ── Firmas válidas de GIF ──────────────────────────────────────────────────────
export const GIF87A = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
export const GIF89A = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])

// ── Env validation ────────────────────────────────────────────────────────────
const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
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

// ── Zod schema de media ───────────────────────────────────────────────────────
const RawMediaSchema = z.object({
  id:          z.string().min(1),
  gif_url:     z.string().min(1),
  attribution: z.string().nullish(),
  media_id:    z.unknown().optional(),
})

export type RawMedia = z.infer<typeof RawMediaSchema>

// ── Bootstrap de bucket ───────────────────────────────────────────────────────

/** Garantiza idempotentemente que el bucket existe. Crea si no existe. */
export async function ensureBucket(client: { storage: Pick<ReturnType<typeof createClient>["storage"], "getBucket" | "createBucket"> }): Promise<void> {
  const { data, error } = await client.storage.getBucket(BUCKET)

  if (data) {
    console.log(`Bucket "${BUCKET}": OK`)
    return
  }

  // getBucket devuelve error tanto para "no existe" como para errores de red.
  // Intentamos crear; si ya existía en una carrera, createBucket devolverá error
  // de duplicado — lo tratamos como éxito (idempotencia).
  const isNotFound =
    !error ||
    error.message.toLowerCase().includes("not found") ||
    error.message.toLowerCase().includes("does not exist") ||
    (error as { status?: number }).status === 404

  if (!isNotFound) {
    console.error(`ERROR: no se pudo verificar el bucket "${BUCKET}": ${error?.message ?? "unknown"}`)
    process.exit(1)
  }

  const { error: createError } = await client.storage.createBucket(BUCKET, {
    public:           false,
    allowedMimeTypes: ["image/gif"],
    fileSizeLimit:    MAX_GIF_BYTES,
  })

  if (createError) {
    // Ignorar error de duplicado (carrera entre instancias)
    const isDuplicate =
      createError.message.toLowerCase().includes("already exists") ||
      createError.message.toLowerCase().includes("duplicate")

    if (!isDuplicate) {
      console.error(`ERROR: no se pudo crear el bucket "${BUCKET}": ${createError.message}`)
      process.exit(1)
    }
  }

  console.log(`Bucket "${BUCKET}": creado`)
}

// ── Funciones puras exportadas (usadas en tests) ───────────────────────────────

/** Extrae el nombre de archivo de gif_url y construye la URL RAW al commit pinned. */
export function buildRawGifUrl(gifUrl: string): string {
  let filename: string
  try {
    const parsed = new URL(gifUrl)
    const parts = parsed.pathname.split("/")
    filename = parts[parts.length - 1] ?? ""
  } catch {
    const parts = gifUrl.replace(/\\/g, "/").split("/")
    filename = parts[parts.length - 1] ?? ""
  }
  if (!filename) throw new Error(`No se pudo extraer filename de gif_url: ${gifUrl}`)
  // Forzar siempre el commit pinned — nunca main/HEAD/latest
  return `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${PINNED_COMMIT}/videos/${filename}`
}

/** Ruta determinista en el bucket: third-party/gymvisual/<sourceId>.gif */
export function buildStoragePath(sourceId: string): string {
  return `third-party/gymvisual/${sourceId}.gif`
}

/** Valida la firma GIF del buffer (GIF87a o GIF89a). */
export function isValidGif(buffer: Buffer): boolean {
  if (buffer.length < 6) return false
  const header = buffer.subarray(0, 6)
  return header.equals(GIF87A) || header.equals(GIF89A)
}

/** Calcula SHA-256 hex del buffer. */
export function sha256hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex")
}

/** Construye el registro para exercise_media. */
export function toMediaRecord(opts: {
  exerciseId:  string
  storagePath: string
  attribution: string | null | undefined
  checksum:    string
  sourceId:    string
}) {
  return {
    exercise_id:       opts.exerciseId,
    kind:              "gif" as const,
    storage_path:      opts.storagePath,
    mime_type:         "image/gif",
    width:             180,
    height:            180,
    attribution:       opts.attribution ?? "© Gym Visual — https://gymvisual.com/",
    license_status:    "pending" as const,
    license_reference: `Source: ${SOURCE}@${PINNED_COMMIT} | THIRD_PARTY_NOTICES.md`,
    is_primary:        true,
    is_active:         false,  // permanece false mientras license_status = pending
    content_sha256:    opts.checksum,
    source:            SOURCE,
    source_id:         opts.sourceId,
  }
}

// ── Utilidades de concurrencia y retry ────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  baseDelay  = RETRY_BASE_DELAY_MS
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        // Backoff exponencial: 1s, 2s, 4s
        await sleep(baseDelay * Math.pow(2, attempt))
      }
    }
  }
  throw lastError
}

/** Pool de concurrencia simple. Procesa tasks hasta `concurrency` en paralelo. */
async function runConcurrent<T, R>(
  items:       T[],
  fn:          (item: T, index: number) => Promise<R>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void
): Promise<{ index: number; result?: R; error?: Error }[]> {
  const results: { index: number; result?: R; error?: Error }[] = []
  let nextIdx   = 0
  let completed = 0

  async function worker() {
    while (nextIdx < items.length) {
      const idx  = nextIdx++
      const item = items[idx]
      try {
        const result = await fn(item, idx)
        results.push({ index: idx, result })
      } catch (err) {
        results.push({ index: idx, error: err instanceof Error ? err : new Error(String(err)) })
      }
      completed++
      onProgress?.(completed, items.length)
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  const workers     = Array.from({ length: workerCount }, worker)
  await Promise.all(workers)

  return results
}

// ── Descarga y validación de GIF ──────────────────────────────────────────────

async function downloadGif(rawUrl: string): Promise<Buffer> {
  const response = await withRetry(async () => {
    const res = await fetch(rawUrl, { signal: AbortSignal.timeout(30_000) })

    // Retry en 429 y 5xx
    if (res.status === 429 || res.status >= 500) {
      throw new Error(`HTTP ${res.status} — retrying`)
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }

    const contentType = res.headers.get("content-type") ?? ""
    if (!contentType.includes("image/gif") && !contentType.includes("application/octet-stream")) {
      // Algunos CDNs sirven GIFs como octet-stream — validamos la firma más adelante
      // Solo rechazamos content-types claramente incorrectos
      if (contentType.startsWith("text/") || contentType.includes("json") || contentType.includes("html")) {
        throw new Error(`Content-Type inválido: ${contentType}`)
      }
    }

    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10)
    if (contentLength > 0 && contentLength > MAX_GIF_BYTES) {
      throw new Error(`Archivo demasiado grande según Content-Length: ${contentLength} bytes`)
    }

    return res
  })

  const arrayBuffer = await response.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  if (buffer.length === 0) {
    throw new Error("Contenido vacío")
  }
  if (buffer.length > MAX_GIF_BYTES) {
    throw new Error(`Archivo demasiado grande: ${buffer.length} bytes`)
  }
  if (!isValidGif(buffer)) {
    throw new Error(`Firma GIF inválida (primeros bytes: ${buffer.subarray(0, 6).toString("hex")})`)
  }

  return buffer
}

// ── Upload a Supabase Storage ─────────────────────────────────────────────────

async function uploadGif(storagePath: string, buffer: Buffer): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType:  "image/gif",
      upsert:       true,     // idempotente: sobrescribe si ya existe
      cacheControl: "31536000",
    })

  if (error) {
    throw new Error(`Storage upload error: ${error.message}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Dataset commit: ${PINNED_COMMIT}`)
  await ensureBucket(supabase)
  console.log("Obteniendo exercises.json...\n")

  // 1. Fetch dataset
  const response = await fetch(DATASET_URL)
  if (!response.ok) {
    console.error(`ERROR al obtener dataset: ${response.status} ${response.statusText}`)
    process.exit(1)
  }

  const payload        = (await response.json()) as unknown
  const sourceArray: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { exercises?: unknown[] }).exercises)
      ? (payload as { exercises: unknown[] }).exercises
      : []

  console.log(`Media source records: ${sourceArray.length}`)

  // 2. Validar con Zod (id, gif_url, attribution)
  const validated: RawMedia[] = []
  const invalid: string[]     = []

  for (const item of sourceArray) {
    const r = RawMediaSchema.safeParse(item)
    if (r.success) {
      validated.push(r.data)
    } else {
      const rawId = (item as Record<string, unknown>)?.id ?? "(sin id)"
      invalid.push(String(rawId))
    }
  }

  if (invalid.length > 0) {
    console.error(`\nRegistros inválidos (${invalid.length}): ${invalid.slice(0, 10).join(", ")}`)
    console.error("Abortando: registros inválidos en el dataset.")
    process.exit(1)
  }

  // 3. Buscar exercise UUIDs en la DB por source_id
  const sourceIds  = validated.map((v) => v.id)
  const LOOKUP_CHUNK = 500

  const exerciseMap = new Map<string, string>() // source_id → uuid

  for (let i = 0; i < sourceIds.length; i += LOOKUP_CHUNK) {
    const chunk = sourceIds.slice(i, i + LOOKUP_CHUNK)
    const { data, error } = await supabase
      .from("exercises")
      .select("id, source_id")
      .eq("source", SOURCE)
      .in("source_id", chunk)

    if (error) {
      console.error(`ERROR al buscar exercises: ${error.message}`)
      process.exit(1)
    }
    for (const ex of data ?? []) {
      exerciseMap.set(ex.source_id, ex.id)
    }
  }

  // 4. Filtrar: solo los que tienen exercise correspondiente
  const matched: RawMedia[] = []
  const unmatched: string[] = []

  for (const item of validated) {
    if (exerciseMap.has(item.id)) {
      matched.push(item)
    } else {
      unmatched.push(item.id)
    }
  }

  console.log(`Exercises matched: ${matched.length}`)
  if (unmatched.length > 0) {
    console.warn(`Sin ejercicio en DB (${unmatched.length}): ${unmatched.slice(0, 5).join(", ")}...`)
    console.warn("Estos registros se omiten — NO se crean ejercicios nuevos desde el importer de media.")
  }

  // 5. Procesar cada GIF con concurrencia limitada
  let downloaded = 0
  let uploaded   = 0
  let upserted   = 0
  let skipped    = 0
  const failures: Array<{ sourceId: string; phase: string; reason: string }> = []

  let lastReported = 0

  const taskResults = await runConcurrent(
    matched,
    async (item) => {
      const exerciseId  = exerciseMap.get(item.id)!
      const storagePath = buildStoragePath(item.id)
      let rawUrl: string

      try {
        rawUrl = buildRawGifUrl(item.gif_url)
      } catch (err) {
        throw Object.assign(new Error(String(err)), { phase: "url-build" })
      }

      // Descarga
      let buffer: Buffer
      try {
        buffer = await downloadGif(rawUrl)
      } catch (err) {
        throw Object.assign(new Error(String(err)), { phase: "download" })
      }
      downloaded++

      // Checksum
      const checksum = sha256hex(buffer)

      // Upload a Storage
      try {
        await uploadGif(storagePath, buffer)
      } catch (err) {
        throw Object.assign(new Error(String(err)), { phase: "upload" })
      }
      uploaded++

      // Upsert exercise_media
      const record = toMediaRecord({
        exerciseId,
        storagePath,
        attribution: item.attribution,
        checksum,
        sourceId:   item.id,
      })

      const { error: dbError } = await supabase
        .from("exercise_media")
        .upsert(record, {
          onConflict:       "source,source_id,kind",
          ignoreDuplicates: false,
        })

      if (dbError) {
        throw Object.assign(new Error(dbError.message), { phase: "db-upsert" })
      }
      upserted++

      return { sourceId: item.id }
    },
    CONCURRENCY,
    (completed, total) => {
      if (completed - lastReported >= PROGRESS_INTERVAL || completed === total) {
        process.stdout.write(`\r[${completed}/${total}]`)
        lastReported = completed
      }
    }
  )

  // Recopilar fallos
  for (const r of taskResults) {
    if (r.error) {
      const err      = r.error as Error & { phase?: string }
      const sourceId = matched[r.index]?.id ?? `idx:${r.index}`
      failures.push({
        sourceId,
        phase:  err.phase ?? "unknown",
        reason: err.message,
      })
    }
  }

  skipped = matched.length - downloaded

  console.log("\n")
  console.log("─".repeat(40))
  console.log(`Source records:        ${sourceArray.length}`)
  console.log(`Matched exercises:     ${matched.length}`)
  console.log(`Downloaded:            ${downloaded}`)
  console.log(`Uploaded:              ${uploaded}`)
  console.log(`Database rows:         ${upserted}`)
  console.log(`Skipped:               ${skipped}`)
  console.log(`Failed:                ${failures.length}`)

  if (failures.length > 0) {
    console.error("\nFallos:")
    for (const f of failures.slice(0, 20)) {
      console.error(`  [${f.phase}] source_id=${f.sourceId} — ${f.reason}`)
    }
    if (failures.length > 20) {
      console.error(`  ... y ${failures.length - 20} más`)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err instanceof Error ? err.message : String(err))
  process.exit(1)
})
