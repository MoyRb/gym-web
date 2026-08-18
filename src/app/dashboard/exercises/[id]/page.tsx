import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getExerciseGifData } from "@/lib/supabase/media"
import { PageHeader } from "@/components/dashboard/PageHeader"

// ── Traducciones de presentación ──────────────────────────────────────────────
const BODY_PART_ES: Record<string, string> = {
  back:          "Espalda",
  cardio:        "Cardio",
  chest:         "Pecho",
  "lower arms":  "Antebrazo",
  "lower legs":  "Pierna inferior",
  neck:          "Cuello",
  shoulders:     "Hombros",
  "upper arms":  "Brazo",
  "upper legs":  "Pierna superior",
  waist:         "Cintura / Core",
}

const EQUIPMENT_ES: Record<string, string> = {
  assisted:               "Asistido",
  band:                   "Banda",
  barbell:                "Barra",
  "body weight":          "Peso corporal",
  "bosu ball":            "Bosu",
  cable:                  "Cable",
  dumbbell:               "Mancuernas",
  "elliptical machine":   "Elíptica",
  "ez barbell":           "Barra EZ",
  hammer:                 "Martillo",
  kettlebell:             "Kettlebell",
  "leverage machine":     "Máquina",
  "medicine ball":        "Balón medicinal",
  "olympic barbell":      "Barra olímpica",
  "resistance band":      "Banda elástica",
  roller:                 "Rodillo",
  rope:                   "Cuerda",
  "skierg machine":       "SkiErg",
  "sled machine":         "Trineo",
  "smith machine":        "Máquina Smith",
  "stability ball":       "Fitball",
  "stationary bike":      "Bicicleta estática",
  "stepmill machine":     "Stepmill",
  tire:                   "Neumático",
  "trap bar":             "Barra trap",
  "upper body ergometer": "Ergómetro",
  weighted:               "Lastrado",
  "wheel roller":         "Rueda abdominal",
}

function translateBodyPart(value: string): string {
  return BODY_PART_ES[value.toLowerCase()] ?? value
}

function translateEquipment(value: string): string {
  return EQUIPMENT_ES[value.toLowerCase()] ?? value
}

// ── Extraer pasos de instrucciones ────────────────────────────────────────────
function resolveSteps(
  instructionSteps: unknown,
  instructions: unknown
): string[] {
  if (instructionSteps !== null && typeof instructionSteps === "object" && !Array.isArray(instructionSteps)) {
    const obj = instructionSteps as Record<string, unknown>
    const es = obj.es
    if (Array.isArray(es) && es.length > 0) {
      return es.map((s) => String(s)).filter(Boolean)
    }
    if (typeof es === "string" && es.trim()) {
      return [es.trim()]
    }
  }
  if (Array.isArray(instructionSteps) && instructionSteps.length > 0) {
    const withEs = instructionSteps.find(
      (item) => typeof item === "object" && item !== null && "es" in (item as object)
    )
    if (withEs) {
      const val = (withEs as Record<string, unknown>).es
      if (typeof val === "string") return [val.trim()]
      if (Array.isArray(val)) return val.map(String).filter(Boolean)
    }
  }

  if (instructions !== null && typeof instructions === "object" && !Array.isArray(instructions)) {
    const obj = instructions as Record<string, unknown>
    const es = obj.es
    if (typeof es === "string" && es.trim()) return [es.trim()]
    if (Array.isArray(es) && es.length > 0) return es.map((s) => String(s)).filter(Boolean)
  }

  return []
}

// ── Página ────────────────────────────────────────────────────────────────────
export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_REGEX.test(id)) notFound()

  const supabase = await createClient()

  const { data: exercise, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single()

  if (error || !exercise) notFound()

  const steps = resolveSteps(exercise.instruction_steps, exercise.instructions)
  const gifData = await getExerciseGifData(exercise.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={exercise.name}
        backHref="/dashboard/exercises"
        backLabel="Catálogo"
      />

      {/* ── 50/50 editorial layout on desktop ── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">

        {/* Left column — GIF (sticky on desktop) */}
        <div className="lg:sticky lg:top-6">
          {gifData ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-muted/20 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gifData.url}
                  alt={`Demostración de ${exercise.name}`}
                  className="h-full w-full object-contain motion-reduce:hidden"
                />
                {/* Reduced motion fallback */}
                <div className="absolute inset-0 hidden motion-reduce:flex items-center justify-center">
                  <p className="text-xs text-muted-foreground text-center px-6">
                    Demostración de {exercise.name}
                  </p>
                </div>
              </div>
              {gifData.attribution && (
                <p className="text-[10px] text-muted-foreground/50 text-center max-w-xs">
                  {gifData.attribution}
                </p>
              )}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-muted/20 aspect-square flex flex-col items-center justify-center gap-2">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center">
                <span className="text-2xl text-muted-foreground/30">▶</span>
              </div>
              <p className="text-xs text-muted-foreground/60 text-center px-6">
                Demostración no disponible
              </p>
            </div>
          )}
        </div>

        {/* Right column — metadata + instructions */}
        <div className="mt-6 flex flex-col gap-6 lg:mt-0">
          {/* Metadata chips */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <MetaCard label="Zona corporal"     value={translateBodyPart(exercise.body_part)} accent />
            <MetaCard label="Equipamiento"      value={translateEquipment(exercise.equipment)} />
            <MetaCard label="Músculo objetivo"  value={exercise.target} />
            {exercise.muscle_group && (
              <MetaCard label="Grupo muscular" value={exercise.muscle_group} />
            )}
          </div>

          {/* Secondary muscles */}
          {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Músculos secundarios
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {exercise.secondary_muscles.map((m: string) => (
                  <span
                    key={m}
                    className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Instrucciones
            </h2>
            {steps.length > 0 ? (
              <ol className="flex flex-col gap-2.5">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                Instrucciones no disponibles para este ejercicio.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MetaCard ─────────────────────────────────────────────────────────────────
function MetaCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`text-sm font-semibold capitalize ${accent ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  )
}
