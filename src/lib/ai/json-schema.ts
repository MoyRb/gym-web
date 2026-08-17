/**
 * JSON Schema for workout plan structured output.
 *
 * Must stay in sync with WorkoutAIOutputSchema in schemas.ts.
 * All fields required. Optional values use nullable types (no additionalProperties).
 *
 * IMPLEMENTATION NOTE — Groq Adapter:
 * Groq GPT-OSS 20B strict structured outputs (response_format: json_schema, strict: true)
 * produced repeated HTTP 400 json_validate_failed with this schema in production.
 * The Groq adapter therefore uses JSON Object Mode (response_format: { type: "json_object" })
 * and applies application-side validation (Zod + candidate ID whitelist + coherence check).
 * This schema is kept as the authoritative contract and for future provider compatibility.
 */

export const WORKOUT_AI_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["name", "summary", "days"],
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    summary: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        required: ["day_number", "name", "description", "exercises"],
        additionalProperties: false,
        properties: {
          day_number: { type: "integer" },
          name: { type: "string" },
          description: { type: ["string", "null"] },
          exercises: {
            type: "array",
            items: {
              type: "object",
              required: [
                "exercise_id",
                "sets",
                "reps_min",
                "reps_max",
                "duration_seconds",
                "rest_seconds",
                "rir",
                "notes",
              ],
              additionalProperties: false,
              properties: {
                exercise_id: { type: "string" },
                sets: { type: "integer" },
                reps_min: { type: ["integer", "null"] },
                reps_max: { type: ["integer", "null"] },
                duration_seconds: { type: ["integer", "null"] },
                rest_seconds: { type: "integer" },
                rir: { type: ["integer", "null"] },
                notes: { type: ["string", "null"] },
              },
            },
          },
        },
      },
    },
  },
}
