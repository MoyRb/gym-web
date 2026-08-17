/**
 * Tests for the AI workout plan generation service.
 * All external dependencies are mocked — no real DB or provider calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { WorkoutAIProvider, WorkoutAIOutput, CandidateExercise } from "@/lib/ai/types"
import { AIProviderError } from "@/lib/ai/types"
import type { UserProfile } from "@/types"

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetCandidates, mockBuildHistory, mockGeneratePlan, mockRpc } = vi.hoisted(() => ({
  mockGetCandidates: vi.fn(),
  mockBuildHistory: vi.fn(),
  mockGeneratePlan: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock("@/lib/workouts/ai/candidate-exercises", () => ({
  getCandidateExercises: mockGetCandidates,
}))

vi.mock("@/lib/workouts/ai/history-summary", () => ({
  buildHistorySummary: mockBuildHistory,
}))

vi.mock("@/lib/workouts/generate-workout-plan", () => ({
  generateWorkoutPlan: mockGeneratePlan,
}))

import { generateAIWorkoutPlan } from "@/lib/workouts/ai/generate-ai-workout-plan"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CANDIDATE_ID = "550e8400-e29b-41d4-a716-446655440001"
const CANDIDATE_ID_2 = "550e8400-e29b-41d4-a716-446655440002"

const CANDIDATES: CandidateExercise[] = [
  {
    id: CANDIDATE_ID,
    name: "Bench Press",
    body_part: "chest",
    equipment: "barbell",
    target: "pectorals",
  },
  {
    id: CANDIDATE_ID_2,
    name: "Squat",
    body_part: "upper legs",
    equipment: "barbell",
    target: "quads",
  },
]

const PROFILE: UserProfile = {
  nombre: "Test User",
  edad: 30,
  sexo: "masculino",
  peso_kg: 80,
  altura_cm: 175,
  experiencia: "intermedio",
  objetivo: "ganar_masa_muscular",
  dias_por_semana: 2,
}

const VALID_AI_OUTPUT: WorkoutAIOutput = {
  name: "AI Plan",
  summary: "An AI generated plan",
  days: [
    {
      day_number: 1,
      name: "Day 1 · Push",
      description: "Upper body push",
      exercises: [
        {
          exercise_id: CANDIDATE_ID,
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
    {
      day_number: 2,
      name: "Day 2 · Legs",
      description: "Lower body",
      exercises: [
        {
          exercise_id: CANDIDATE_ID_2,
          sets: 4,
          reps_min: 6,
          reps_max: 10,
          duration_seconds: null,
          rest_seconds: 120,
          rir: 1,
          notes: null,
        },
      ],
    },
  ],
}

function makeMockProvider(output: WorkoutAIOutput | Error): WorkoutAIProvider {
  return {
    generateWorkout: vi.fn().mockImplementation(async () => {
      if (output instanceof Error) throw output
      return output
    }),
  }
}

function makeSupabaseMock(planId = "plan-ai-001") {
  mockRpc.mockResolvedValue({ data: planId, error: null })
  return { rpc: mockRpc } as unknown as Parameters<typeof generateAIWorkoutPlan>[0]
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCandidates.mockResolvedValue(CANDIDATES)
  mockBuildHistory.mockResolvedValue(null)
  mockGeneratePlan.mockResolvedValue({
    planId: "plan-template-001",
    resolvedExercises: 3,
    unresolvedExercises: [],
    emptyDays: [],
  })
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("generateAIWorkoutPlan", () => {
  describe("AI success path", () => {
    it("returns source='ai' when AI generation succeeds", async () => {
      const provider = makeMockProvider(VALID_AI_OUTPUT)
      const supabase = makeSupabaseMock("plan-ai-001")

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).toBe("ai")
      expect(result.planId).toBe("plan-ai-001")
    })

    it("calls create_workout_plan RPC with p_source='ai'", async () => {
      const provider = makeMockProvider(VALID_AI_OUTPUT)
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(mockRpc).toHaveBeenCalledWith(
        "create_workout_plan",
        expect.objectContaining({ p_source: "ai" }),
      )
    })

    it("calls create_workout_plan with p_user_id from argument, not body", async () => {
      const provider = makeMockProvider(VALID_AI_OUTPUT)
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-from-session", PROFILE, provider)

      expect(mockRpc).toHaveBeenCalledWith(
        "create_workout_plan",
        expect.objectContaining({ p_user_id: "user-from-session" }),
      )
    })

    it("does not call fallback generateWorkoutPlan on success", async () => {
      const provider = makeMockProvider(VALID_AI_OUTPUT)
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(mockGeneratePlan).not.toHaveBeenCalled()
    })

    it("returns fallbackReason undefined on success", async () => {
      const provider = makeMockProvider(VALID_AI_OUTPUT)
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.fallbackReason).toBeUndefined()
    })
  })

  describe("Fallback on provider failure", () => {
    it("returns source='template' when provider throws", async () => {
      const provider = makeMockProvider(new AIProviderError("timeout", "timeout"))
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).toBe("template")
    })

    it("calls deterministic fallback on provider error", async () => {
      const provider = makeMockProvider(new AIProviderError("server error", "server"))
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(mockGeneratePlan).toHaveBeenCalledOnce()
    })

    it("sets fallbackReason on provider failure", async () => {
      const provider = makeMockProvider(new AIProviderError("rate limit", "rate_limit"))
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.fallbackReason).toBeDefined()
      expect(typeof result.fallbackReason).toBe("string")
    })

    it("makes exactly one provider call per generation (no retries)", async () => {
      const generateWorkout = vi.fn().mockResolvedValue({
        ...VALID_AI_OUTPUT,
        days: VALID_AI_OUTPUT.days.map((d) => ({
          ...d,
          exercises: d.exercises.map((e) => ({
            ...e,
            exercise_id: "uuid-not-in-candidates", // invalid — falls back immediately
          })),
        })),
      })
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      // No retries — exactly 1 call, then fallback
      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("does not retry on any error (1 call total)", async () => {
      const generateWorkout = vi.fn().mockRejectedValue(new AIProviderError("timeout", "timeout"))
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("does not retry on config error", async () => {
      const generateWorkout = vi.fn().mockRejectedValue(new AIProviderError("no key", "config"))
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      // Config error breaks immediately — only 1 attempt
      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("does not retry on auth error", async () => {
      const generateWorkout = vi.fn().mockRejectedValue(new AIProviderError("auth failed", "auth"))
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("does not retry on request_too_large error", async () => {
      const generateWorkout = vi.fn().mockRejectedValue(new AIProviderError("413", "request_too_large"))
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("does not retry on server error (1 call, immediate fallback)", async () => {
      const generateWorkout = vi.fn().mockRejectedValue(new AIProviderError("server error", "server"))
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("falls back to template on request_too_large", async () => {
      const provider = makeMockProvider(new AIProviderError("413", "request_too_large"))
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).toBe("template")
      expect(mockGeneratePlan).toHaveBeenCalledOnce()
    })

    it("does not retry on schema error (json_validate_failed)", async () => {
      const generateWorkout = vi.fn().mockRejectedValue(
        new AIProviderError("Provider generated output that failed JSON schema", "schema"),
      )
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("falls back to template on schema error", async () => {
      const provider = makeMockProvider(
        new AIProviderError("Provider generated output that failed JSON schema", "schema"),
      )
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).toBe("template")
      expect(mockGeneratePlan).toHaveBeenCalledOnce()
    })

    it("does not retry on timeout error (1 call, immediate fallback)", async () => {
      const generateWorkout = vi.fn().mockRejectedValue(new AIProviderError("timed out", "timeout"))
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(generateWorkout).toHaveBeenCalledTimes(1)
    })

    it("existing plan is untouched until RPC is called (RPC not called on AI failure)", async () => {
      const provider = makeMockProvider(new AIProviderError("timeout", "timeout"))
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      // RPC should NOT have been called with source='ai' (only fallback runs)
      const rpcCallsWithAI = mockRpc.mock.calls.filter(
        (call: unknown[]) =>
          (call[1] as Record<string, unknown>)?.p_source === "ai",
      )
      expect(rpcCallsWithAI).toHaveLength(0)
    })
  })

  describe("Candidate ID validation", () => {
    it("falls back when AI returns exercise_id not in candidate set", async () => {
      const outputWithBadId: WorkoutAIOutput = {
        ...VALID_AI_OUTPUT,
        days: [
          {
            day_number: 1,
            name: "Day 1",
            description: null,
            exercises: [
              {
                exercise_id: "uuid-not-in-candidates",
                sets: 3,
                reps_min: 8,
                reps_max: 12,
                duration_seconds: null,
                rest_seconds: 90,
                rir: null,
                notes: null,
              },
            ],
          },
          {
            day_number: 2,
            name: "Day 2",
            description: null,
            exercises: [
              {
                exercise_id: CANDIDATE_ID_2,
                sets: 3,
                reps_min: 8,
                reps_max: 12,
                duration_seconds: null,
                rest_seconds: 90,
                rir: null,
                notes: null,
              },
            ],
          },
        ],
      }
      const provider = makeMockProvider(outputWithBadId)
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).toBe("template")
    })
  })

  describe("Coherence validation", () => {
    it("falls back when AI returns wrong number of days", async () => {
      const outputWithWrongDays: WorkoutAIOutput = {
        ...VALID_AI_OUTPUT,
        days: [VALID_AI_OUTPUT.days[0]], // 1 day, but profile expects 2
      }
      const provider = makeMockProvider(outputWithWrongDays)
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).toBe("template")
    })
  })

  describe("Cascade fallback (AI + template both fail)", () => {
    it("throws when AI fails and template fallback also fails", async () => {
      const provider = makeMockProvider(new AIProviderError("server error", "server"))
      mockGeneratePlan.mockRejectedValue(new Error("template engine failed"))
      const supabase = makeSupabaseMock()

      await expect(
        generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider),
      ).rejects.toThrow()
    })

    it("does not call RPC when template fallback also fails (existing plan preserved)", async () => {
      const provider = makeMockProvider(new AIProviderError("server error", "server"))
      mockGeneratePlan.mockRejectedValue(new Error("template engine failed"))
      const supabase = makeSupabaseMock()

      await expect(
        generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider),
      ).rejects.toThrow()

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it("thrown error message mentions both AI and template failure", async () => {
      const provider = makeMockProvider(new AIProviderError("server error", "server"))
      mockGeneratePlan.mockRejectedValue(new Error("template engine failed"))
      const supabase = makeSupabaseMock()

      await expect(
        generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider),
      ).rejects.toThrow(/template engine failed/)
    })
  })

  describe("Fallback source integrity", () => {
    it("fallback source is always 'template', never 'ai'", async () => {
      const provider = makeMockProvider(new AIProviderError("any error", "server"))
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).not.toBe("ai")
      expect(result.source).toBe("template")
    })
  })

  describe("History summary", () => {
    it("passes history to provider input when available", async () => {
      mockBuildHistory.mockResolvedValue({
        recent_sessions_count: 5,
        recent_exercise_ids: [CANDIDATE_ID],
      })
      const generateWorkout = vi.fn().mockResolvedValue(VALID_AI_OUTPUT)
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      const inputArg = generateWorkout.mock.calls[0][0] as { history_summary: unknown }
      expect(inputArg.history_summary).not.toBeNull()
    })

    it("sends null history when none exists", async () => {
      mockBuildHistory.mockResolvedValue(null)
      const generateWorkout = vi.fn().mockResolvedValue(VALID_AI_OUTPUT)
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      const inputArg = generateWorkout.mock.calls[0][0] as { history_summary: unknown }
      expect(inputArg.history_summary).toBeNull()
    })
  })

  describe("Coherence failure observability", () => {
    it("falls back with source='template' on coherence failure", async () => {
      // 1 day output but profile expects 2 → DAYS_COUNT_MISMATCH
      const outputWithWrongDays: WorkoutAIOutput = {
        ...VALID_AI_OUTPUT,
        days: [VALID_AI_OUTPUT.days[0]],
      }
      const provider = makeMockProvider(outputWithWrongDays)
      const supabase = makeSupabaseMock()

      const result = await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      expect(result.source).toBe("template")
    })

    it("does not call RPC with source='ai' on coherence failure", async () => {
      const outputWithWrongDays: WorkoutAIOutput = {
        ...VALID_AI_OUTPUT,
        days: [VALID_AI_OUTPUT.days[0]],
      }
      const provider = makeMockProvider(outputWithWrongDays)
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", PROFILE, provider)

      const rpcCallsWithAI = mockRpc.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.p_source === "ai",
      )
      expect(rpcCallsWithAI).toHaveLength(0)
    })
  })

  describe("Privacy", () => {
    it("does NOT include userId in the AI provider input", async () => {
      const generateWorkout = vi.fn().mockResolvedValue(VALID_AI_OUTPUT)
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-secret-id", PROFILE, provider)

      const inputArg = generateWorkout.mock.calls[0][0] as Record<string, unknown>
      const inputStr = JSON.stringify(inputArg)
      expect(inputStr).not.toContain("user-secret-id")
    })

    it("does NOT include username or full_name in AI provider input", async () => {
      const profileWithName: UserProfile = { ...PROFILE, nombre: "John Doe" }
      const generateWorkout = vi.fn().mockResolvedValue(VALID_AI_OUTPUT)
      const provider: WorkoutAIProvider = { generateWorkout }
      const supabase = makeSupabaseMock()

      await generateAIWorkoutPlan(supabase, "user-1", profileWithName, provider)

      const inputArg = generateWorkout.mock.calls[0][0] as Record<string, unknown>
      const profileSent = (inputArg.profile as Record<string, unknown>)
      // Profile should have fitness fields but not the name
      expect(Object.keys(profileSent)).not.toContain("nombre")
      expect(Object.keys(profileSent)).not.toContain("name")
    })
  })
})
