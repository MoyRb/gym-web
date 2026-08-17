/**
 * Unit tests for GroqWorkoutProvider adapter.
 *
 * Verifies JSON Object Mode, parsing/validation pipeline, and error classification.
 * Mocks groq-sdk entirely — no real API calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { WorkoutAIInput } from "@/lib/ai/types"
import { AIProviderError } from "@/lib/ai/types"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockCreate, MockAPIError } = vi.hoisted(() => {
  class MockAPIError extends Error {
    status: number | undefined
    error: unknown
    headers: undefined
    constructor(message: string, error?: unknown, status?: number) {
      super(message)
      this.name = "APIError"
      this.status = status
      this.error = error
      this.headers = undefined
    }
  }
  return { mockCreate: vi.fn(), MockAPIError }
})

vi.mock("groq-sdk", () => ({
  default: class {
    chat = { completions: { create: mockCreate } }
  },
  APIError: MockAPIError,
}))

import { GroqWorkoutProvider } from "@/lib/ai/providers/groq"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEST_UUID = "550e8400-e29b-41d4-a716-446655440001"

const VALID_INPUT: WorkoutAIInput = {
  profile: {
    age: null,
    sex: null,
    weight_kg: null,
    height_cm: null,
    experience: "intermedio",
    goal: "ganar_masa_muscular",
    days_per_week: 1,
  },
  candidates: [
    {
      id: TEST_UUID,
      name: "Bench Press",
      body_part: "chest",
      equipment: "barbell",
      target: "pectorals",
    },
  ],
  history_summary: null,
}

const VALID_OUTPUT_OBJ = {
  name: "Test Plan",
  summary: "A plan",
  days: [
    {
      day_number: 1,
      name: "Push",
      description: null,
      exercises: [
        {
          exercise_id: TEST_UUID,
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          duration_seconds: null,
          rest_seconds: 90,
          rir: 2,
          notes: null,
        },
      ],
    },
  ],
}

function makeCompletion(content: string) {
  return { choices: [{ message: { content } }] }
}

import { WORKOUT_AI_SYSTEM_PROMPT } from "@/lib/ai/system-prompt"

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GROQ_API_KEY = "test-key"
  delete process.env.GROQ_MODEL
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GroqWorkoutProvider", () => {
  describe("JSON Object Mode", () => {
    it("calls the API with response_format type json_object", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      expect((args.response_format as Record<string, unknown>).type).toBe("json_object")
    })

    it("does not pass json_schema to the API", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      expect(args.response_format).not.toHaveProperty("json_schema")
    })

    it("makes exactly one API call per generateWorkout invocation", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)

      expect(mockCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe("output parsing and Zod validation", () => {
    it("returns validated output for valid JSON", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      const result = await provider.generateWorkout(VALID_INPUT)

      expect(result.name).toBe("Test Plan")
      expect(result.days).toHaveLength(1)
    })

    it("throws AIProviderError on empty content", async () => {
      mockCreate.mockResolvedValue(makeCompletion(""))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toBeInstanceOf(AIProviderError)
    })

    it("throws AIProviderError on malformed JSON", async () => {
      mockCreate.mockResolvedValue(makeCompletion("not-json { broken"))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toBeInstanceOf(AIProviderError)
    })

    it("throws AIProviderError when model wraps JSON in markdown code fence", async () => {
      const wrapped = "```json\n" + JSON.stringify(VALID_OUTPUT_OBJ) + "\n```"
      mockCreate.mockResolvedValue(makeCompletion(wrapped))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toBeInstanceOf(AIProviderError)
    })

    it("throws AIProviderError when day is missing 'name'", async () => {
      const bad = {
        ...VALID_OUTPUT_OBJ,
        days: [
          {
            day_number: 1,
            description: null,
            exercises: [VALID_OUTPUT_OBJ.days[0].exercises[0]],
            // name intentionally absent
          },
        ],
      }
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(bad)))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toBeInstanceOf(AIProviderError)
    })

    it("normalizes absent 'description' to null (nullable field, not required to be present)", async () => {
      const withoutDescription = {
        ...VALID_OUTPUT_OBJ,
        days: [
          {
            day_number: 1,
            name: "Push",
            // description intentionally absent — raw schema tolerates this
            exercises: [VALID_OUTPUT_OBJ.days[0].exercises[0]],
          },
        ],
      }
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(withoutDescription)))
      const provider = new GroqWorkoutProvider()
      const result = await provider.generateWorkout(VALID_INPUT)
      expect(result.days[0].description).toBeNull()
    })

    it("normalizes absent nullable exercise fields to null (duration_seconds, rir, notes)", async () => {
      const withoutNullables = {
        ...VALID_OUTPUT_OBJ,
        days: [
          {
            day_number: 1,
            name: "Push",
            description: null,
            exercises: [
              {
                exercise_id: TEST_UUID,
                sets: 3,
                reps_min: 8,
                reps_max: 12,
                rest_seconds: 90,
                // duration_seconds, rir, notes intentionally absent
              },
            ],
          },
        ],
      }
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(withoutNullables)))
      const provider = new GroqWorkoutProvider()
      const result = await provider.generateWorkout(VALID_INPUT)
      expect(result.days[0].exercises[0].duration_seconds).toBeNull()
      expect(result.days[0].exercises[0].rir).toBeNull()
      expect(result.days[0].exercises[0].notes).toBeNull()
    })

    it("throws AIProviderError when a truly required exercise key is absent (rest_seconds)", async () => {
      const bad = {
        ...VALID_OUTPUT_OBJ,
        days: [
          {
            day_number: 1,
            name: "Push",
            description: null,
            exercises: [
              {
                exercise_id: TEST_UUID,
                sets: 3,
                reps_min: 8,
                reps_max: 12,
                // rest_seconds intentionally absent — required field
              },
            ],
          },
        ],
      }
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(bad)))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toBeInstanceOf(AIProviderError)
    })

    it("throws AIProviderError when exercise_id is absent", async () => {
      const bad = {
        ...VALID_OUTPUT_OBJ,
        days: [
          {
            day_number: 1,
            name: "Push",
            description: null,
            exercises: [
              {
                // exercise_id intentionally absent
                sets: 3,
                reps_min: 8,
                reps_max: 12,
                rest_seconds: 90,
              },
            ],
          },
        ],
      }
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(bad)))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toBeInstanceOf(AIProviderError)
    })

    it("throws AIProviderError when no choices returned", async () => {
      mockCreate.mockResolvedValue({ choices: [] })
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toBeInstanceOf(AIProviderError)
    })
  })

  describe("Qwen model config", () => {
    beforeEach(() => {
      process.env.GROQ_MODEL = "qwen/qwen3.6-27b"
    })

    it("sends a single user message (no system role) for Qwen models", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      const messages = args.messages as Array<{ role: string; content: string }>
      expect(messages).toHaveLength(1)
      expect(messages[0].role).toBe("user")
    })

    it("Qwen user message contains the system prompt content", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      const messages = args.messages as Array<{ role: string; content: string }>
      expect(messages[0].content).toContain(WORKOUT_AI_SYSTEM_PROMPT)
    })

    it("passes reasoning_effort='none' for Qwen models", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      expect(args.reasoning_effort).toBe("none")
    })

    it("passes reasoning_format='hidden' for Qwen models", async () => {
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      expect(args.reasoning_format).toBe("hidden")
    })
  })

  describe("Non-Qwen model config", () => {
    it("uses system + user roles for non-Qwen models", async () => {
      process.env.GROQ_MODEL = "meta-llama/llama-3-70b"
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)
      delete process.env.GROQ_MODEL

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      const messages = args.messages as Array<{ role: string; content: string }>
      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe("system")
      expect(messages[1].role).toBe("user")
    })

    it("does not pass reasoning_effort for non-Qwen models", async () => {
      process.env.GROQ_MODEL = "meta-llama/llama-3-70b"
      mockCreate.mockResolvedValue(makeCompletion(JSON.stringify(VALID_OUTPUT_OBJ)))
      const provider = new GroqWorkoutProvider()
      await provider.generateWorkout(VALID_INPUT)
      delete process.env.GROQ_MODEL

      const args = mockCreate.mock.calls[0][0] as Record<string, unknown>
      expect(args.reasoning_effort).toBeUndefined()
    })
  })

  describe("error classification", () => {
    it("throws code='auth' on HTTP 401", async () => {
      mockCreate.mockRejectedValue(new MockAPIError("unauthorized", undefined, 401))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toMatchObject({ code: "auth" })
    })

    it("throws code='auth' on HTTP 403", async () => {
      mockCreate.mockRejectedValue(new MockAPIError("forbidden", undefined, 403))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toMatchObject({ code: "auth" })
    })

    it("throws code='schema' on HTTP 400 json_validate_failed", async () => {
      mockCreate.mockRejectedValue(
        new MockAPIError("bad", { error: { code: "json_validate_failed" } }, 400),
      )
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toMatchObject({ code: "schema" })
    })

    it("throws code='schema' on other HTTP 400", async () => {
      mockCreate.mockRejectedValue(
        new MockAPIError("bad request", { error: { code: "other" } }, 400),
      )
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toMatchObject({ code: "schema" })
    })

    it("throws code='request_too_large' on HTTP 413", async () => {
      mockCreate.mockRejectedValue(new MockAPIError("too large", undefined, 413))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toMatchObject({
        code: "request_too_large",
      })
    })

    it("throws code='rate_limit' on HTTP 429", async () => {
      mockCreate.mockRejectedValue(new MockAPIError("rate limit", undefined, 429))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toMatchObject({
        code: "rate_limit",
      })
    })

    it("throws code='server' on HTTP 500", async () => {
      mockCreate.mockRejectedValue(new MockAPIError("server error", undefined, 500))
      const provider = new GroqWorkoutProvider()
      await expect(provider.generateWorkout(VALID_INPUT)).rejects.toMatchObject({ code: "server" })
    })
  })
})
