import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getExerciseGifSignedUrl } from "@/lib/supabase/media"
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
// Prioridad: instruction_steps.es → instructions.es → vacío
function resolveSteps(
  instructionSteps: unknown,
  instructions: unknown
): string[] {
  // 1. Intentar instruction_steps.es
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
  // Array directo en instruction_steps (sin clave de idioma)
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

  // 2. Fallback: instructions.es
  if (instructions !== null && typeof instructions === "object" && !Array.isArray(instructions)) {
    const obj = instructions as Record<string, unknown>
    const es = obj.es
    if (typeof es === "string" && es.trim()) {
      // Puede venir como un texto largo con saltos de línea o comas
      return [es.trim()]
    }
    if (Array.isArray(es) && es.length > 0) {
      return es.map((s) => String(s)).filter(Boolean)
    }
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

  // Validación básica de UUID antes de consultar
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

  // Signed URL para GIF (server-side, no expone service_role al cliente).
  // Solo retorna URL cuando license_status IN ('licensed','owned') AND is_active=true.
  // Con GIF pendientes (license_status='pending') siempre retorna null.
  const gifUrl = await getExerciseGifSignedUrl(exercise.id)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={exercise.name}
        backHref="/dashboard/exercises"
        backLabel="Catálogo"
      />

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaCard label="Zona corporal" value={translateBodyPart(exercise.body_part)} />
        <MetaCard label="Equipamiento"  value={translateEquipment(exercise.equipment)} />
        <MetaCard label="Músculo objetivo" value={exercise.target} />
        {exercise.muscle_group && (
          <MetaCard label="Grupo muscular" value={exercise.muscle_group} />
        )}
      </div>

      {/* Músculos secundarios */}
      {exercise.secondary_muscles && exercise.secondary_muscles.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Músculos secundarios</h2>
          <div className="flex flex-wrap gap-1.5">
            {exercise.secondary_muscles.map((m: string) => (
              <span
                key={m}
                className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Instrucciones</h2>
        {steps.length > 0 ? (
          <ol className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-border bg-muted/20 p-3">
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

      {/* Demostración visual */}
      {gifUrl ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Demostración</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={gifUrl}
            alt={`Demostración de ${exercise.name}`}
            width={180}
            height={180}
            className="rounded-lg border border-border object-contain"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 text-center py-2">
          Demostración visual no disponible en este momento.
        </p>
      )}
    </div>
  )
}

// ── Componente auxiliar ───────────────────────────────────────────────────────
function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold capitalize">{value}</p>
    </div>
  )
}
