/**
 * Zod validation schemas for AI-generated workout plan output.
 *
 * Two-stage validation pipeline:
 *
 * Stage 1 — WorkoutAIRawOutputSchema (tolerant):
 *   Validates raw provider JSON. Semantically nullable fields (description,
 *   reps_min, reps_max, duration_seconds, rir, notes) are optional here
 *   because LLMs sometimes omit them instead of outputting null.
 *   Critical fields remain required.
 *
 * Stage 2 — WorkoutAIOutputSchema (strict canonical):
 *   Applied after normalizing missing nullable fields → null.
 *   The rest of Gym Web always receives this guaranteed shape.
 *
 * Do NOT accept the provider response without passing through both stages.
 */

import { z } from "zod"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Raw provider schema (stage 1 — tolerant) ──────────────────────────────────

const AIRawExerciseSchema = z.object({
  exercise_id: z.string().regex(UUID_REGEX, "exercise_id must be a valid UUID"),
  sets: z.number().int().min(1).max(20),
  reps_min: z.number().int().min(1).max(100).nullable().optional(),
  reps_max: z.number().int().min(1).max(100).nullable().optional(),
  duration_seconds: z.number().int().min(1).max(3600).nullable().optional(),
  rest_seconds: z.number().int().min(0).max(600),
  rir: z.number().int().min(0).max(5).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

const AIRawDaySchema = z.object({
  day_number: z.number().int().min(1).max(7),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable().optional(),
  exercises: z.array(AIRawExerciseSchema).min(1).max(20),
})

export const WorkoutAIRawOutputSchema = z.object({
  name: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  days: z.array(AIRawDaySchema).min(1).max(7),
})

export type WorkoutAIRawOutput = z.infer<typeof WorkoutAIRawOutputSchema>

// ── Strict canonical schema (stage 2 — applied after normalization) ────────────

export const AIExerciseSchema = z.object({
  exercise_id: z.string().regex(UUID_REGEX, "exercise_id must be a valid UUID"),
  sets: z.number().int().min(1).max(20),
  reps_min: z.number().int().min(1).max(100).nullable(),
  reps_max: z.number().int().min(1).max(100).nullable(),
  duration_seconds: z.number().int().min(1).max(3600).nullable(),
  rest_seconds: z.number().int().min(0).max(600),
  rir: z.number().int().min(0).max(5).nullable(),
  notes: z.string().max(500).nullable(),
})

export const AIDaySchema = z.object({
  day_number: z.number().int().min(1).max(7),
  name: z.string().min(1).max(200),
  description: z.string().max(500).nullable(),
  exercises: z.array(AIExerciseSchema).min(1).max(20),
})

export const WorkoutAIOutputSchema = z.object({
  name: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  days: z.array(AIDaySchema).min(1).max(7),
})

export type WorkoutAIOutputRaw = z.infer<typeof WorkoutAIOutputSchema>

// ── Batch schemas ──────────────────────────────────────────────────────────────
// Batch output has no top-level name/summary — only an array of days.
// Each batch contains 1–2 days with up to 12 exercises each.

const BatchAIRawDaySchema = z.object({
  day_number: z.number().int().min(1).max(7),
  exercises: z.array(AIRawExerciseSchema).min(1).max(12),
})

/** Stage 1 — tolerant raw batch schema (nullable fields may be absent) */
export const WorkoutBatchAIRawOutputSchema = z.object({
  days: z.array(BatchAIRawDaySchema).min(1).max(2),
})

export type WorkoutBatchAIRawOutput = z.infer<typeof WorkoutBatchAIRawOutputSchema>

const BatchAIDaySchema = z.object({
  day_number: z.number().int().min(1).max(7),
  exercises: z.array(AIExerciseSchema).min(1).max(12),
})

/** Stage 2 — strict canonical batch schema (all nullable fields present) */
export const WorkoutBatchAIOutputSchema = z.object({
  days: z.array(BatchAIDaySchema).min(1).max(2),
})

// ── Exercise selection schemas ─────────────────────────────────────────────────
// AI only returns exercise_ids — no sets, reps, rest, or any prescription fields.
// Two-stage pattern kept for consistency, even though neither stage has nullable fields.

const AISelectionDayRawSchema = z.object({
  day_number: z.number().int().min(1).max(7),
  exercise_ids: z.array(z.string().regex(UUID_REGEX, "exercise_id must be a valid UUID")).min(1).max(20),
})

/** Stage 1 — tolerant raw selection schema */
export const AIExerciseSelectionRawOutputSchema = z.object({
  days: z.array(AISelectionDayRawSchema).min(1).max(2),
})

export type AIExerciseSelectionRawOutput = z.infer<typeof AIExerciseSelectionRawOutputSchema>

const AISelectionDaySchema = z.object({
  day_number: z.number().int().min(1).max(7),
  exercise_ids: z.array(z.string().regex(UUID_REGEX)).min(1).max(20),
})

/** Stage 2 — strict canonical selection schema */
export const AIExerciseSelectionOutputSchema = z.object({
  days: z.array(AISelectionDaySchema).min(1).max(2),
})

export type AIExerciseSelectionOutput = z.infer<typeof AIExerciseSelectionOutputSchema>
