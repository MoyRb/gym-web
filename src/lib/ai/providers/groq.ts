/**
 * Groq AI Provider
 *
 * Implements WorkoutAIProvider using the Groq API (groq-sdk).
 * This is the ONLY file that imports Groq directly.
 * The rest of the application depends on WorkoutAIProvider interface, not this class.
 *
 * Output mode: JSON Object (response_format: { type: "json_object" }).
 * Note: Groq GPT-OSS 20B strict structured outputs (json_schema + strict:true)
 * produced repeated json_validate_failed (HTTP 400) with the production workout schema.
 * The adapter therefore uses JSON Object Mode and relies on application-side validation
 * (Zod, candidate ID whitelist, coherence check) as the authoritative contract.
 * WORKOUT_AI_JSON_SCHEMA is kept as documentation for the expected contract.
 *
 * server-only.
 */

import "server-only"
import Groq, { APIError as GroqAPIError } from "groq-sdk"
import type {
  WorkoutAIProvider,
  WorkoutAIInput,
  WorkoutAIOutput,
  WorkoutBatchAIInput,
  BatchGenerationResult,
  RateLimitInfo,
  ExerciseSelectionBatchInput,
  SelectionBatchResult,
} from "@/lib/ai/types"
import { AIProviderError } from "@/lib/ai/types"
import {
  WorkoutAIOutputSchema,
  WorkoutAIRawOutputSchema,
  WorkoutBatchAIOutputSchema,
  WorkoutBatchAIRawOutputSchema,
  AIExerciseSelectionRawOutputSchema,
  AIExerciseSelectionOutputSchema,
} from "@/lib/ai/schemas"
import { WORKOUT_AI_SYSTEM_PROMPT, WORKOUT_BATCH_SYSTEM_PROMPT, WORKOUT_SELECTION_SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

/** Request timeout in milliseconds */
const PROVIDER_TIMEOUT_MS = 30_000

/** Max tokens for the AI response (a workout plan fits well within this) */
const MAX_OUTPUT_TOKENS = 2000

/** Default model if GROQ_MODEL env is not set */
const DEFAULT_MODEL = "qwen/qwen3-27b"

// ── Model config ───────────────────────────────────────────────────────────────

interface GroqModelConfig {
  /** Merge system prompt into user message (required for reasoning models that don't support system role) */
  useUserMessageOnly: boolean
  /** Reasoning effort hint (Qwen 3.x and similar reasoning models) */
  reasoning_effort?: string
  /** Reasoning format: "hidden" suppresses chain-of-thought from the output */
  reasoning_format?: string
}

function getGroqModelConfig(model: string): GroqModelConfig {
  if (model.toLowerCase().includes("qwen")) {
    return {
      useUserMessageOnly: true,
      reasoning_effort: "none",
      reasoning_format: "hidden",
    }
  }
  return { useUserMessageOnly: false }
}

function buildProfileParts(profile: WorkoutAIInput["profile"]): string[] {
  return [
    `Goal:${profile.goal}`,
    `Exp:${profile.experience}`,
    `Days:${profile.days_per_week}`,
    profile.age != null ? `Age:${profile.age}` : null,
    profile.sex != null ? `Sex:${profile.sex}` : null,
    profile.weight_kg != null ? `Wt:${profile.weight_kg}kg` : null,
    profile.height_cm != null ? `Ht:${profile.height_cm}cm` : null,
  ].filter((p): p is string => p !== null)
}

function buildCandidateLines(candidates: WorkoutAIInput["candidates"]): string[] {
  return candidates.map(
    (c) => `${c.id}|${c.name}|${c.body_part}|${c.equipment}|${c.target}`,
  )
}

function buildHistoryText(history_summary: WorkoutAIInput["history_summary"]): string {
  if (history_summary == null) return "No history."
  return (
    `Sessions(30d):${history_summary.recent_sessions_count}` +
    (history_summary.recent_exercise_ids.length > 0
      ? ` RecentIDs:${history_summary.recent_exercise_ids.join(",")}`
      : "")
  )
}

function buildUserMessage(input: WorkoutAIInput): string {
  const { profile, candidates, history_summary } = input
  return [
    `PROFILE: ${buildProfileParts(profile).join(" | ")}`,
    "",
    `CANDIDATES (${candidates.length}, use ONLY these ids):`,
    ...buildCandidateLines(candidates),
    "",
    `HISTORY: ${buildHistoryText(history_summary)}`,
    "",
    `Generate a ${profile.days_per_week}-day plan using ONLY the exercise_ids above.`,
  ].join("\n")
}

function buildSelectionUserMessage(input: ExerciseSelectionBatchInput): string {
  const { profile, batch_days, candidates, history_summary, min_exercises_per_day, max_exercises_per_day } = input
  const daySpecs = batch_days.map((d) => `${d.day_number}:${d.name}`).join(", ")
  // Compact candidate format: id|name|body_part|equipment
  // Including equipment so Qwen can see what type of resistance each exercise uses.
  const candidateLines = candidates.map((c) => `${c.id}|${c.name}|${c.body_part}|${c.equipment}`)
  const envPart = profile.training_environment ? ` | Env:${profile.training_environment}` : ""
  return [
    `PROFILE: Goal:${profile.goal} | Exp:${profile.experience}${envPart}`,
    "",
    `BATCH_DAYS: ${daySpecs}`,
    `SELECTION_COUNT: Select ${min_exercises_per_day} to ${max_exercises_per_day} exercises per day.`,
    "",
    `CANDIDATES (${candidates.length}, use ONLY these ids — format: id|name|body_part|equipment):`,
    ...candidateLines,
    "",
    `HISTORY: ${buildHistoryText(history_summary)}`,
  ].join("\n")
}

function buildBatchUserMessage(input: WorkoutBatchAIInput): string {
  const { profile, batch_days, candidates, history_summary } = input
  const daySpecs = batch_days.map((d) => `${d.day_number}:${d.name}`).join(", ")
  return [
    `PROFILE: ${buildProfileParts(profile).join(" | ")}`,
    "",
    `BATCH_DAYS (output ONLY these day_numbers): ${daySpecs}`,
    "",
    `CANDIDATES (${candidates.length}, use ONLY these ids):`,
    ...buildCandidateLines(candidates),
    "",
    `HISTORY: ${buildHistoryText(history_summary)}`,
  ].join("\n")
}

/**
 * Parses rate limit headers from the Groq response.
 * Safe — never throws.
 */
function extractRateLimitInfo(headers: Headers): RateLimitInfo {
  const remainingStr = headers.get("x-ratelimit-remaining-tokens")
  const retryAfterStr = headers.get("retry-after")
  return {
    remainingTokens: remainingStr != null ? parseInt(remainingStr, 10) : null,
    retryAfterSeconds: retryAfterStr != null ? parseInt(retryAfterStr, 10) : null,
  }
}

/**
 * Dev-only: log the failed_generation preview from a json_validate_failed error.
 * Only first 300 chars — never log full content (may contain candidate data).
 * Never called in production.
 */
function debugGroqJsonValidateFailed(detail: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return
  const failedGen = detail.failed_generation
  console.error("[Groq Debug] json_validate_failed", {
    message: (detail.message as string) ?? null,
    failed_generation_preview: typeof failedGen === "string" ? failedGen.slice(0, 300) : null,
  })
}

/** Dev-only sanitized error log — never logs secrets, prompt, profile, or candidates. */
function debugGroqError(err: GroqAPIError): void {
  if (process.env.NODE_ENV === "production") return

  // err.error is the raw JSON body from Groq: { error: { message, type, code } }
  const body = err.error as Record<string, unknown> | undefined
  const detail = (body?.error as Record<string, unknown>) ?? body ?? {}

  const retryAfter = err.headers?.get?.("retry-after") ?? null
  const tokenLimit = err.headers?.get?.("x-ratelimit-limit-tokens") ?? null
  const tokensRemaining = err.headers?.get?.("x-ratelimit-remaining-tokens") ?? null

  console.error("[Groq Debug] API error", {
    status: err.status ?? null,
    name: err.name,
    type: (detail.type as string) ?? null,
    code: (detail.code as string) ?? null,
    message: (detail.message as string) ?? err.message,
    retryAfter,
    tokenLimit,
    tokensRemaining,
  })
}

function mapGroqError(err: unknown): AIProviderError {
  if (err instanceof AIProviderError) return err

  if (err instanceof GroqAPIError) {
    // Log the raw error details in dev before classifying
    debugGroqError(err)

    if (err.status === 401 || err.status === 403) {
      return new AIProviderError("Provider authentication failed", "auth")
    }
    if (err.status === 400) {
      const body = err.error as Record<string, unknown> | undefined
      const detail = (body?.error as Record<string, unknown>) ?? body ?? {}
      if (detail.code === "json_validate_failed") {
        debugGroqJsonValidateFailed(detail)
        return new AIProviderError("Provider generated output that failed JSON schema", "schema")
      }
      return new AIProviderError("Provider invalid request (status 400)", "schema")
    }
    if (err.status === 413) {
      return new AIProviderError("Request too large for provider", "request_too_large")
    }
    if (err.status === 429) {
      const retryAfterStr = err.headers?.get?.("retry-after") ?? null
      const retryAfterSeconds = retryAfterStr != null ? parseInt(retryAfterStr, 10) : null
      return new AIProviderError("Provider rate limit exceeded", "rate_limit", retryAfterSeconds)
    }
    if (err.status != null && err.status >= 500) {
      return new AIProviderError("Provider server error", "server")
    }
    return new AIProviderError(`Provider API error (status ${String(err.status)})`, "server")
  }

  if (err instanceof Error && (err.name === "AbortError" || err.message.includes("timeout"))) {
    return new AIProviderError("Provider request timed out", "timeout")
  }

  return new AIProviderError("Unknown provider error", "server")
}

export class GroqWorkoutProvider implements WorkoutAIProvider {
  private readonly client: Groq
  private readonly model: string

  constructor() {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new AIProviderError(
        "GROQ_API_KEY is not configured. Set it as a server-side environment variable.",
        "config",
      )
    }
    // Never log the API key
    this.client = new Groq({ apiKey })
    this.model = process.env.GROQ_MODEL ?? DEFAULT_MODEL
  }

  async generateWorkout(input: WorkoutAIInput): Promise<WorkoutAIOutput> {
    const config = getGroqModelConfig(this.model)
    const userMessage = buildUserMessage(input)

    const messages: Groq.Chat.ChatCompletionMessageParam[] = config.useUserMessageOnly
      ? [{ role: "user", content: `${WORKOUT_AI_SYSTEM_PROMPT}\n\n---\n\n${userMessage}` }]
      : [
          { role: "system", content: WORKOUT_AI_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ]

    // Dev-only: confirm request parameters before calling the provider
    if (process.env.NODE_ENV !== "production") {
      console.log("[Groq Debug] pre-request", {
        model: this.model,
        candidate_count: input.candidates.length,
        prompt_chars: messages.reduce((s, m) => s + (typeof m.content === "string" ? m.content.length : 0), 0),
        has_api_key: Boolean(process.env.GROQ_API_KEY),
        response_format: "json_object",
        use_user_message_only: config.useUserMessageOnly,
        reasoning_effort: config.reasoning_effort ?? null,
      })
    }

    let completion: Groq.Chat.ChatCompletion
    try {
      completion = (await this.client.chat.completions.create(
        {
          model: this.model,
          messages,
          response_format: { type: "json_object" },
          max_tokens: MAX_OUTPUT_TOKENS,
          ...(config.reasoning_effort != null && {
            reasoning_effort: config.reasoning_effort,
            reasoning_format: config.reasoning_format,
          }),
        } as Parameters<typeof this.client.chat.completions.create>[0],
        { timeout: PROVIDER_TIMEOUT_MS },
      )) as Groq.Chat.ChatCompletion
    } catch (err) {
      throw mapGroqError(err)
    }

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new AIProviderError("Provider returned empty response content", "validation")
    }

    // Stage 1: JSON.parse
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new AIProviderError("Provider returned non-JSON content", "json_parse")
    }

    // Stage 2: raw validation (nullable fields may be absent)
    const rawResult = WorkoutAIRawOutputSchema.safeParse(parsed)
    if (!rawResult.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[AI Validation Debug]", JSON.stringify({
          stage: "raw",
          issues: rawResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }))
      }
      throw new AIProviderError(
        `Provider output failed raw validation: ${rawResult.error.message}`,
        "raw_validation",
      )
    }

    // Stage 3: normalize missing nullable fields → null
    const normalized = {
      name: rawResult.data.name,
      summary: rawResult.data.summary,
      days: rawResult.data.days.map((day) => ({
        day_number: day.day_number,
        name: day.name,
        description: day.description ?? null,
        exercises: day.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps_min: ex.reps_min ?? null,
          reps_max: ex.reps_max ?? null,
          duration_seconds: ex.duration_seconds ?? null,
          rest_seconds: ex.rest_seconds,
          rir: ex.rir ?? null,
          notes: ex.notes ?? null,
        })),
      })),
    }

    // Stage 4: strict canonical validation (belt-and-suspenders after normalization)
    const strictResult = WorkoutAIOutputSchema.safeParse(normalized)
    if (!strictResult.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[AI Validation Debug]", JSON.stringify({
          stage: "strict",
          issues: strictResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }))
      }
      throw new AIProviderError(
        `Provider output failed strict validation after normalization: ${strictResult.error.message}`,
        "strict_validation",
      )
    }

    return strictResult.data
  }

  /**
   * Generates exercises for a single batch of 1–2 days.
   * Returns the validated output plus rate limit info from response headers.
   *
   * Throws AIProviderError on any provider/validation failure.
   * Never catches rate_limit errors — callers must handle them and retry.
   */
  async generateBatch(input: WorkoutBatchAIInput): Promise<BatchGenerationResult> {
    const config = getGroqModelConfig(this.model)
    const userMessage = buildBatchUserMessage(input)

    const messages: Groq.Chat.ChatCompletionMessageParam[] = config.useUserMessageOnly
      ? [{ role: "user", content: `${WORKOUT_BATCH_SYSTEM_PROMPT}\n\n---\n\n${userMessage}` }]
      : [
          { role: "system", content: WORKOUT_BATCH_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ]

    if (process.env.NODE_ENV !== "production") {
      console.log("[Groq Batch Debug] pre-request", {
        model: this.model,
        batch_days: input.batch_days.map((d) => `${d.day_number}:${d.name}`),
        candidate_count: input.candidates.length,
        prompt_chars: messages.reduce((s, m) => s + (typeof m.content === "string" ? m.content.length : 0), 0),
      })
    }

    let completion: Groq.Chat.ChatCompletion
    let rateLimitInfo: RateLimitInfo = { remainingTokens: null, retryAfterSeconds: null }

    try {
      const { data, response } = await (
        this.client.chat.completions.create(
          {
            model: this.model,
            messages,
            response_format: { type: "json_object" },
            max_tokens: MAX_OUTPUT_TOKENS,
            ...(config.reasoning_effort != null && {
              reasoning_effort: config.reasoning_effort,
              reasoning_format: config.reasoning_format,
            }),
          } as Parameters<typeof this.client.chat.completions.create>[0],
          { timeout: PROVIDER_TIMEOUT_MS },
        ) as unknown as { withResponse(): Promise<{ data: Groq.Chat.ChatCompletion; response: Response }> }
      ).withResponse()

      completion = data
      rateLimitInfo = extractRateLimitInfo(response.headers)
    } catch (err) {
      throw mapGroqError(err)
    }

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new AIProviderError("Provider returned empty response content", "validation")
    }

    // Stage 1: JSON.parse
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new AIProviderError("Provider returned non-JSON content", "json_parse")
    }

    // Stage 2: raw validation (nullable fields may be absent)
    const rawResult = WorkoutBatchAIRawOutputSchema.safeParse(parsed)
    if (!rawResult.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Batch AI Validation Debug]", JSON.stringify({
          stage: "raw",
          issues: rawResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }))
      }
      throw new AIProviderError(
        `Batch output failed raw validation: ${rawResult.error.message}`,
        "raw_validation",
      )
    }

    // Stage 3: normalize missing nullable fields → null
    const normalized = {
      days: rawResult.data.days.map((day) => ({
        day_number: day.day_number,
        exercises: day.exercises.map((ex) => ({
          exercise_id: ex.exercise_id,
          sets: ex.sets,
          reps_min: ex.reps_min ?? null,
          reps_max: ex.reps_max ?? null,
          duration_seconds: ex.duration_seconds ?? null,
          rest_seconds: ex.rest_seconds,
          rir: ex.rir ?? null,
          notes: ex.notes ?? null,
        })),
      })),
    }

    // Stage 4: strict canonical validation
    const strictResult = WorkoutBatchAIOutputSchema.safeParse(normalized)
    if (!strictResult.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Batch AI Validation Debug]", JSON.stringify({
          stage: "strict",
          issues: strictResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }))
      }
      throw new AIProviderError(
        `Batch output failed strict validation: ${strictResult.error.message}`,
        "strict_validation",
      )
    }

    return { output: strictResult.data, rateLimitInfo }
  }

  /**
   * Selects exercise IDs for a single batch of 1–2 days.
   * AI outputs only exercise_ids — no sets, reps, rest, or notes.
   * Prescription is handled deterministically by the backend after this call.
   *
   * Returns the validated selection output plus rate limit info from response headers.
   * Throws AIProviderError on any provider/validation failure.
   */
  async generateBatchSelection(input: ExerciseSelectionBatchInput): Promise<SelectionBatchResult> {
    const config = getGroqModelConfig(this.model)
    const userMessage = buildSelectionUserMessage(input)

    const messages: Groq.Chat.ChatCompletionMessageParam[] = config.useUserMessageOnly
      ? [{ role: "user", content: `${WORKOUT_SELECTION_SYSTEM_PROMPT}\n\n---\n\n${userMessage}` }]
      : [
          { role: "system", content: WORKOUT_SELECTION_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ]

    if (process.env.NODE_ENV !== "production") {
      console.log("[Groq Selection Debug] pre-request", {
        model: this.model,
        batch_days: input.batch_days.map((d) => `${d.day_number}:${d.name}`),
        candidate_count: input.candidates.length,
        count_bounds: `${input.min_exercises_per_day}–${input.max_exercises_per_day}`,
        prompt_chars: messages.reduce((s, m) => s + (typeof m.content === "string" ? m.content.length : 0), 0),
      })
    }

    let completion: Groq.Chat.ChatCompletion
    let rateLimitInfo: RateLimitInfo = { remainingTokens: null, retryAfterSeconds: null }

    try {
      const { data, response } = await (
        this.client.chat.completions.create(
          {
            model: this.model,
            messages,
            response_format: { type: "json_object" },
            max_tokens: 800,
            ...(config.reasoning_effort != null && {
              reasoning_effort: config.reasoning_effort,
              reasoning_format: config.reasoning_format,
            }),
          } as Parameters<typeof this.client.chat.completions.create>[0],
          { timeout: PROVIDER_TIMEOUT_MS },
        ) as unknown as { withResponse(): Promise<{ data: Groq.Chat.ChatCompletion; response: Response }> }
      ).withResponse()

      completion = data
      rateLimitInfo = extractRateLimitInfo(response.headers)
    } catch (err) {
      throw mapGroqError(err)
    }

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new AIProviderError("Provider returned empty response content", "validation")
    }

    // Stage 1: JSON.parse
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new AIProviderError("Provider returned non-JSON content", "json_parse")
    }

    // Stage 2: raw validation
    const rawResult = AIExerciseSelectionRawOutputSchema.safeParse(parsed)
    if (!rawResult.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Selection AI Validation Debug]", JSON.stringify({
          stage: "raw",
          issues: rawResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }))
      }
      throw new AIProviderError(
        `Selection output failed raw validation: ${rawResult.error.message}`,
        "raw_validation",
      )
    }

    // Stage 3: normalize (pass-through — no nullable fields to fill)
    const normalized = {
      days: rawResult.data.days.map((day) => ({
        day_number: day.day_number,
        exercise_ids: day.exercise_ids,
      })),
    }

    // Stage 4: strict canonical validation
    const strictResult = AIExerciseSelectionOutputSchema.safeParse(normalized)
    if (!strictResult.success) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[Selection AI Validation Debug]", JSON.stringify({
          stage: "strict",
          issues: strictResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          })),
        }))
      }
      throw new AIProviderError(
        `Selection output failed strict validation: ${strictResult.error.message}`,
        "strict_validation",
      )
    }

    return { output: strictResult.data, rateLimitInfo }
  }
}
