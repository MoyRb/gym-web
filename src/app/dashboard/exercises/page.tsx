import Link from "next/link"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/dashboard/PageHeader"
import { EmptyState } from "@/components/dashboard/EmptyState"

// ── Traducciones de presentación ──────────────────────────────────────────────
// Los valores originales del dataset se muestran en español sin alterar los
// datos persistidos en la base de datos.
const BODY_PART_ES: Record<string, string> = {
  back:        "Espalda",
  cardio:      "Cardio",
  chest:       "Pecho",
  "lower arms": "Antebrazo",
  "lower legs": "Pierna inferior",
  neck:         "Cuello",
  shoulders:    "Hombros",
  "upper arms": "Brazo",
  "upper legs": "Pierna superior",
  waist:        "Cintura / Core",
}

const EQUIPMENT_ES: Record<string, string> = {
  assisted:             "Asistido",
  band:                 "Banda",
  barbell:              "Barra",
  "body weight":        "Peso corporal",
  "bosu ball":          "Bosu",
  cable:                "Cable",
  dumbbell:             "Mancuernas",
  "elliptical machine": "Elíptica",
  "ez barbell":         "Barra EZ",
  hammer:               "Martillo",
  kettlebell:           "Kettlebell",
  "leverage machine":   "Máquina",
  "medicine ball":      "Balón medicinal",
  "olympic barbell":    "Barra olímpica",
  "resistance band":    "Banda elástica",
  roller:               "Rodillo",
  rope:                 "Cuerda",
  "skierg machine":     "SkiErg",
  "sled machine":       "Trineo",
  "smith machine":      "Máquina Smith",
  "stability ball":     "Fitball",
  "stationary bike":    "Bicicleta estática",
  "stepmill machine":   "Stepmill",
  tire:                 "Neumático",
  "trap bar":           "Barra trap",
  "upper body ergometer": "Ergómetro",
  weighted:             "Lastrado",
  "wheel roller":       "Rueda abdominal",
}

function translateBodyPart(value: string): string {
  return BODY_PART_ES[value.toLowerCase()] ?? value
}

function translateEquipment(value: string): string {
  return EQUIPMENT_ES[value.toLowerCase()] ?? value
}

// ── Constantes ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 24

// Listas de valores del dataset (fuente pinned) para los filtros
const KNOWN_BODY_PARTS = [
  "back", "cardio", "chest", "lower arms", "lower legs",
  "neck", "shoulders", "upper arms", "upper legs", "waist",
]

const KNOWN_EQUIPMENT = [
  "band", "barbell", "body weight", "cable", "dumbbell",
  "kettlebell", "leverage machine", "olympic barbell", "resistance band",
  "smith machine", "stability ball",
]

// ── Construcción de URLs de filtro ────────────────────────────────────────────
function filterUrl(base: {
  q: string
  bodyPart: string
  equipment: string
}, overrides: Partial<{ q: string; bodyPart: string; equipment: string; page: number }>): string {
  const merged = { ...base, page: 1, ...overrides }
  const sp = new URLSearchParams()
  if (merged.q)         sp.set("q", merged.q)
  if (merged.bodyPart)  sp.set("bodyPart", merged.bodyPart)
  if (merged.equipment) sp.set("equipment", merged.equipment)
  if (merged.page > 1)  sp.set("page", String(merged.page))
  const qs = sp.toString()
  return qs ? `/dashboard/exercises?${qs}` : "/dashboard/exercises"
}

// ── Página ────────────────────────────────────────────────────────────────────
export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const rawQ = typeof sp.q === "string" ? sp.q : ""
  // Sanitizar q: limitar longitud y eliminar caracteres conflictivos con PostgREST
  const q = rawQ.trim().slice(0, 100).replace(/[,%]/g, "")
  const bodyPart  = typeof sp.bodyPart  === "string" ? sp.bodyPart  : ""
  const equipment = typeof sp.equipment === "string" ? sp.equipment : ""
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1)

  const supabase = await createClient()

  let dbQuery = supabase
    .from("exercises")
    .select("id, name, body_part, equipment, target, muscle_group", { count: "exact" })
    .eq("is_active", true)
    .order("name", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (q) {
    dbQuery = dbQuery.or(
      `name.ilike.%${q}%,target.ilike.%${q}%,muscle_group.ilike.%${q}%`
    )
  }
  if (bodyPart)  dbQuery = dbQuery.eq("body_part", bodyPart)
  if (equipment) dbQuery = dbQuery.eq("equipment", equipment)

  const { data: exercises, count, error } = await dbQuery

  const total = count ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentFilters = { q, bodyPart, equipment }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ejercicios"
        subtitle={total > 0 ? `${total} ejercicio${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}` : "Catálogo de ejercicios"}
      />

      {/* Búsqueda */}
      <form method="get" action="/dashboard/exercises" className="flex gap-2 max-w-md">
        {bodyPart  && <input type="hidden" name="bodyPart"  value={bodyPart} />}
        {equipment && <input type="hidden" name="equipment" value={equipment} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={rawQ}
            placeholder="Nombre, músculo objetivo..."
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
        >
          Buscar
        </button>
        {(q || bodyPart || equipment) && (
          <Link
            href="/dashboard/exercises"
            className="flex h-10 items-center rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Filtros — zona corporal */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Zona corporal</p>
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_BODY_PARTS.map((bp) => {
            const active = bodyPart === bp
            return (
              <Link
                key={bp}
                href={filterUrl(currentFilters, active ? { bodyPart: "" } : { bodyPart: bp })}
                className={[
                  "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {translateBodyPart(bp)}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Filtros — equipamiento */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Equipamiento</p>
        <div className="flex flex-wrap gap-1.5">
          {KNOWN_EQUIPMENT.map((eq) => {
            const active = equipment === eq
            return (
              <Link
                key={eq}
                href={filterUrl(currentFilters, active ? { equipment: "" } : { equipment: eq })}
                className={[
                  "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {translateEquipment(eq)}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Resultados */}
      {error ? (
        <p className="text-sm text-destructive">Error al cargar ejercicios. Intenta de nuevo.</p>
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Sin resultados"
          description={
            q || bodyPart || equipment
              ? "No hay ejercicios que coincidan con los filtros aplicados."
              : "No hay ejercicios disponibles por el momento."
          }
          action={
            (q || bodyPart || equipment) ? (
              <Link
                href="/dashboard/exercises"
                className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                Ver todos los ejercicios
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <Link
                key={ex.id}
                href={`/dashboard/exercises/${ex.id}`}
                className="group flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
              >
                <p className="text-sm font-semibold leading-snug transition-colors group-hover:text-primary line-clamp-2">
                  {ex.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {translateBodyPart(ex.body_part)}
                  </span>
                  <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {translateEquipment(ex.equipment)}
                  </span>
                </div>
                {ex.target && (
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {ex.target}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {page > 1 && (
                <Link
                  href={filterUrl(currentFilters, { page: page - 1 })}
                  className="h-9 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted flex items-center"
                >
                  Anterior
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={filterUrl(currentFilters, { page: page + 1 })}
                  className="h-9 rounded-lg border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted flex items-center"
                >
                  Siguiente
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
