/**
 * import-exercise-media.test.ts
 *
 * Tests unitarios para la lógica del importer de GIFs.
 * Sin llamadas reales a GitHub ni a Supabase.
 * Todos los efectos externos están mockeados o no se invocan.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHash } from "node:crypto"

// ── Funciones puras replicadas (misma lógica que import-exercise-media.ts) ─────
// Se replican para aislar los tests del código que tiene efectos en módulo-nivel.

const SOURCE        = "hasaneyldrm/exercises-dataset"
const PINNED_COMMIT = "7455efae41b330c265e7cd4b78dfa848e7ce5ebd"

const GIF87A = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
const GIF89A = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])

function buildRawGifUrl(gifUrl: string): string {
  let filename: string
  try {
    const parsed = new URL(gifUrl)
    const parts  = parsed.pathname.split("/")
    filename     = parts[parts.length - 1] ?? ""
  } catch {
    const parts = gifUrl.replace(/\\/g, "/").split("/")
    filename    = parts[parts.length - 1] ?? ""
  }
  if (!filename) throw new Error(`No se pudo extraer filename de gif_url: ${gifUrl}`)
  return `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${PINNED_COMMIT}/videos/${filename}`
}

function buildStoragePath(sourceId: string): string {
  return `third-party/gymvisual/${sourceId}.gif`
}

function isValidGif(buffer: Buffer): boolean {
  if (buffer.length < 6) return false
  const header = buffer.subarray(0, 6)
  return header.equals(GIF87A) || header.equals(GIF89A)
}

function sha256hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex")
}

function toMediaRecord(opts: {
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
    is_active:         false,
    content_sha256:    opts.checksum,
    source:            SOURCE,
    source_id:         opts.sourceId,
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const FAKE_GIF87A = Buffer.concat([GIF87A, Buffer.alloc(100)])
const FAKE_GIF89A = Buffer.concat([GIF89A, Buffer.alloc(100)])
const FAKE_EXERCISE_ID  = "uuid-exercise-001"
const FAKE_SOURCE_ID    = "0001"
const FAKE_STORAGE_PATH = `third-party/gymvisual/${FAKE_SOURCE_ID}.gif`
const FAKE_CHECKSUM     = sha256hex(FAKE_GIF89A)

// ── 1. Construcción de URL RAW desde commit pinned ────────────────────────────
describe("buildRawGifUrl — URL RAW al commit pinned", () => {
  it("construye URL correcta desde gif_url con path relativo", () => {
    const url = buildRawGifUrl("videos/0001.gif")
    expect(url).toBe(
      `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/${PINNED_COMMIT}/videos/0001.gif`
    )
  })

  it("extrae el filename de una URL completa de GitHub (main)", () => {
    const url = buildRawGifUrl(
      "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/0025.gif"
    )
    // Siempre usa el commit pinned, nunca main
    expect(url).toContain(PINNED_COMMIT)
    expect(url).toContain("0025.gif")
    expect(url).not.toContain("/main/")
  })

  it("extrae el filename de una URL de CDN externo", () => {
    const url = buildRawGifUrl("https://cdn.gymvisual.com/exercises/0042.gif")
    expect(url).toContain(PINNED_COMMIT)
    expect(url).toContain("0042.gif")
    expect(url).toContain("raw.githubusercontent.com")
  })

  it("lanza error si no puede extraer filename", () => {
    expect(() => buildRawGifUrl("")).toThrow()
  })

  it("siempre usa el commit pinned — nunca HEAD, main ni latest", () => {
    const url = buildRawGifUrl("videos/0001.gif")
    expect(url).toContain(PINNED_COMMIT)
    expect(url).not.toMatch(/\/main\/|\/HEAD\/|\/latest\//)
  })
})

// ── 2. Validación GIF87a ──────────────────────────────────────────────────────
describe("isValidGif — firma GIF87a", () => {
  it("acepta buffer con firma GIF87a", () => {
    expect(isValidGif(FAKE_GIF87A)).toBe(true)
  })

  it("los primeros 6 bytes GIF87a son: 47 49 46 38 37 61", () => {
    expect(GIF87A.toString("hex")).toBe("474946383761")
  })
})

// ── 3. Validación GIF89a ──────────────────────────────────────────────────────
describe("isValidGif — firma GIF89a", () => {
  it("acepta buffer con firma GIF89a", () => {
    expect(isValidGif(FAKE_GIF89A)).toBe(true)
  })

  it("los primeros 6 bytes GIF89a son: 47 49 46 38 39 61", () => {
    expect(GIF89A.toString("hex")).toBe("474946383961")
  })
})

// ── 4. Rechazo de contenido no-GIF ────────────────────────────────────────────
describe("isValidGif — rechazo de no-GIF", () => {
  it("rechaza buffer vacío", () => {
    expect(isValidGif(Buffer.alloc(0))).toBe(false)
  })

  it("rechaza buffer con menos de 6 bytes", () => {
    expect(isValidGif(Buffer.from([0x47, 0x49, 0x46]))).toBe(false)
  })

  it("rechaza JPEG (firma: FFD8FF...)", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
    expect(isValidGif(jpeg)).toBe(false)
  })

  it("rechaza PNG (firma: 89504E47...)", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
    expect(isValidGif(png)).toBe(false)
  })

  it("rechaza texto HTML", () => {
    const html = Buffer.from("<html>this is not a gif</html>")
    expect(isValidGif(html)).toBe(false)
  })

  it("rechaza ceros", () => {
    expect(isValidGif(Buffer.alloc(100, 0))).toBe(false)
  })
})

// ── 5. Ruta de Storage determinista ──────────────────────────────────────────
describe("buildStoragePath — path determinista", () => {
  it("construye la ruta correcta para un source_id", () => {
    expect(buildStoragePath("0001")).toBe("third-party/gymvisual/0001.gif")
  })

  it("la misma entrada siempre produce la misma salida (idempotente)", () => {
    const path1 = buildStoragePath("abc-123")
    const path2 = buildStoragePath("abc-123")
    expect(path1).toBe(path2)
  })

  it("siempre empieza con 'third-party/gymvisual/'", () => {
    expect(buildStoragePath("0999")).toMatch(/^third-party\/gymvisual\//)
  })

  it("siempre termina en .gif", () => {
    expect(buildStoragePath("custom-id")).toMatch(/\.gif$/)
  })
})

// ── 6. Mapping exercise → exercise_media ─────────────────────────────────────
describe("toMediaRecord — mapping correcto", () => {
  const record = toMediaRecord({
    exerciseId:  FAKE_EXERCISE_ID,
    storagePath: FAKE_STORAGE_PATH,
    attribution: "© Gym Visual — https://gymvisual.com/",
    checksum:    FAKE_CHECKSUM,
    sourceId:    FAKE_SOURCE_ID,
  })

  it("kind siempre es 'gif'", () => {
    expect(record.kind).toBe("gif")
  })

  it("mime_type siempre es 'image/gif'", () => {
    expect(record.mime_type).toBe("image/gif")
  })

  it("dimensiones son 180x180", () => {
    expect(record.width).toBe(180)
    expect(record.height).toBe(180)
  })

  it("is_primary es true", () => {
    expect(record.is_primary).toBe(true)
  })
})

// ── 7. license_status siempre pending ────────────────────────────────────────
describe("toMediaRecord — license_status siempre pending", () => {
  it("license_status es 'pending'", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: "abc", sourceId: "s1",
    })
    expect(r.license_status).toBe("pending")
  })

  it("NO es 'licensed'", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: "abc", sourceId: "s1",
    })
    expect(r.license_status).not.toBe("licensed")
  })

  it("NO es 'owned'", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: "abc", sourceId: "s1",
    })
    expect(r.license_status).not.toBe("owned")
  })
})

// ── 8. is_active siempre false ────────────────────────────────────────────────
describe("toMediaRecord — is_active siempre false", () => {
  it("is_active es false", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: "abc", sourceId: "s1",
    })
    expect(r.is_active).toBe(false)
  })

  it("no hay ninguna ruta de código que ponga is_active=true en el mapping", () => {
    // El mapping siempre hardcodea false — no hay param para cambiarlo
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: "custom", checksum: "abc", sourceId: "s1",
    })
    expect(r.is_active).toBe(false)
  })
})

// ── 9. Attribution conservada ─────────────────────────────────────────────────
describe("toMediaRecord — attribution conservada", () => {
  it("usa el valor del dataset cuando está presente", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: "© Gym Visual", checksum: "abc", sourceId: "s1",
    })
    expect(r.attribution).toBe("© Gym Visual")
  })

  it("usa el valor por defecto cuando attribution es null", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: "abc", sourceId: "s1",
    })
    expect(r.attribution).toContain("Gym Visual")
  })

  it("usa el valor por defecto cuando attribution es undefined", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: undefined, checksum: "abc", sourceId: "s1",
    })
    expect(r.attribution).toContain("Gym Visual")
  })
})

// ── 10. source / source_id correctos ─────────────────────────────────────────
describe("toMediaRecord — source y source_id", () => {
  it("source es 'hasaneyldrm/exercises-dataset'", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: "abc", sourceId: "0001",
    })
    expect(r.source).toBe("hasaneyldrm/exercises-dataset")
  })

  it("source_id coincide con el id del ejercicio del dataset", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: "abc", sourceId: "custom-id-42",
    })
    expect(r.source_id).toBe("custom-id-42")
  })
})

// ── 11. Checksum SHA-256 ──────────────────────────────────────────────────────
describe("sha256hex — checksum correcto", () => {
  it("produce un hash SHA-256 hexadecimal de 64 chars", () => {
    const hash = sha256hex(FAKE_GIF89A)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("el mismo buffer siempre produce el mismo hash (determinista)", () => {
    expect(sha256hex(FAKE_GIF89A)).toBe(sha256hex(FAKE_GIF89A))
  })

  it("buffers distintos producen hashes distintos", () => {
    const buf1 = Buffer.from("GIF89a data-1")
    const buf2 = Buffer.from("GIF89a data-2")
    expect(sha256hex(buf1)).not.toBe(sha256hex(buf2))
  })

  it("el hash del record coincide con el calculado del buffer original", () => {
    const buffer = FAKE_GIF89A
    const expected = createHash("sha256").update(buffer).digest("hex")
    expect(sha256hex(buffer)).toBe(expected)
  })

  it("el checksum se almacena en el record", () => {
    const r = toMediaRecord({
      exerciseId: "uuid-x", storagePath: "p.gif",
      attribution: null, checksum: FAKE_CHECKSUM, sourceId: "s1",
    })
    expect(r.content_sha256).toBe(FAKE_CHECKSUM)
    expect(r.content_sha256).toHaveLength(64)
  })
})

// ── 12. Idempotencia del mapping ──────────────────────────────────────────────
describe("idempotencia del mapping", () => {
  it("el mismo input produce exactamente el mismo output en dos llamadas", () => {
    const opts = {
      exerciseId:  "uuid-idempotent",
      storagePath: "third-party/gymvisual/0001.gif",
      attribution: "© Gym Visual",
      checksum:    FAKE_CHECKSUM,
      sourceId:    "0001",
    }
    expect(toMediaRecord(opts)).toEqual(toMediaRecord(opts))
  })

  it("la ruta de storage del mismo source_id siempre es la misma", () => {
    expect(buildStoragePath("0001")).toBe(buildStoragePath("0001"))
  })

  it("la URL RAW del mismo gif_url siempre es la misma", () => {
    const gUrl = "videos/0001.gif"
    expect(buildRawGifUrl(gUrl)).toBe(buildRawGifUrl(gUrl))
  })
})

// ── 13. ensureBucket — bootstrap idempotente del bucket ───────────────────────

/** Replica de ensureBucket para tests (misma lógica, sin import del script). */
async function ensureBucket(
  client: {
    storage: {
      getBucket: (name: string) => Promise<{ data: unknown; error: { message: string; status?: number } | null }>
      createBucket: (name: string, opts: object) => Promise<{ error: { message: string } | null }>
    }
  }
): Promise<{ created: boolean }> {
  const BUCKET       = "exercise-media"
  const MAX_GIF_BYTES = 5 * 1024 * 1024

  const { data, error } = await client.storage.getBucket(BUCKET)

  if (data) {
    return { created: false }
  }

  const isNotFound =
    !error ||
    error.message.toLowerCase().includes("not found") ||
    error.message.toLowerCase().includes("does not exist") ||
    error.status === 404

  if (!isNotFound) {
    throw new Error(`no se pudo verificar el bucket: ${error?.message ?? "unknown"}`)
  }

  const { error: createError } = await client.storage.createBucket(BUCKET, {
    public:           false,
    allowedMimeTypes: ["image/gif"],
    fileSizeLimit:    MAX_GIF_BYTES,
  })

  if (createError) {
    const isDuplicate =
      createError.message.toLowerCase().includes("already exists") ||
      createError.message.toLowerCase().includes("duplicate")
    if (!isDuplicate) {
      throw new Error(`no se pudo crear el bucket: ${createError.message}`)
    }
  }

  return { created: true }
}

describe("ensureBucket — bootstrap idempotente", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("bucket existente → no llama a createBucket", async () => {
    const getBucket    = vi.fn().mockResolvedValue({ data: { name: "exercise-media" }, error: null })
    const createBucket = vi.fn()
    const client       = { storage: { getBucket, createBucket } }

    const result = await ensureBucket(client)

    expect(getBucket).toHaveBeenCalledWith("exercise-media")
    expect(createBucket).not.toHaveBeenCalled()
    expect(result.created).toBe(false)
  })

  it("bucket inexistente → llama a createBucket con opciones correctas", async () => {
    const getBucket    = vi.fn().mockResolvedValue({ data: null, error: { message: "The resource was not found", status: 404 } })
    const createBucket = vi.fn().mockResolvedValue({ error: null })
    const client       = { storage: { getBucket, createBucket } }

    const result = await ensureBucket(client)

    expect(getBucket).toHaveBeenCalledWith("exercise-media")
    expect(createBucket).toHaveBeenCalledWith("exercise-media", {
      public:           false,
      allowedMimeTypes: ["image/gif"],
      fileSizeLimit:    5 * 1024 * 1024,
    })
    expect(result.created).toBe(true)
  })

  it("createBucket falla con error inesperado → lanza excepción", async () => {
    const getBucket    = vi.fn().mockResolvedValue({ data: null, error: { message: "not found", status: 404 } })
    const createBucket = vi.fn().mockResolvedValue({ error: { message: "network timeout" } })
    const client       = { storage: { getBucket, createBucket } }

    await expect(ensureBucket(client)).rejects.toThrow("network timeout")
  })
})
