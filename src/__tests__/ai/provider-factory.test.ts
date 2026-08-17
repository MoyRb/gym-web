/**
 * Tests for the AI provider factory.
 * Verifies routing by AI_PROVIDER env variable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { AIProviderError } from "@/lib/ai/types"

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Hoisted so the mock factory can reference them
const { MockGroqProviderClass } = vi.hoisted(() => {
  // Must be a regular function (not arrow) to be usable as a constructor
  function MockGroqProviderClass(this: Record<string, unknown>) {
    this.generateWorkout = vi.fn()
  }
  return { MockGroqProviderClass }
})

vi.mock("@/lib/ai/providers/groq", () => ({
  GroqWorkoutProvider: MockGroqProviderClass,
}))

import { getWorkoutAIProvider } from "@/lib/ai/provider"
import { GroqWorkoutProvider } from "@/lib/ai/providers/groq"

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getWorkoutAIProvider", () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("returns a GroqWorkoutProvider instance when AI_PROVIDER=groq", () => {
    process.env.AI_PROVIDER = "groq"
    const provider = getWorkoutAIProvider()
    expect(provider).toBeInstanceOf(GroqWorkoutProvider)
  })

  it("defaults to groq when AI_PROVIDER is not set", () => {
    delete process.env.AI_PROVIDER
    const provider = getWorkoutAIProvider()
    expect(provider).toBeInstanceOf(GroqWorkoutProvider)
  })

  it("throws AIProviderError for unknown AI_PROVIDER", () => {
    process.env.AI_PROVIDER = "unknown_provider"
    expect(() => getWorkoutAIProvider()).toThrowError(AIProviderError)
  })

  it("error code is 'config' for unknown provider", () => {
    process.env.AI_PROVIDER = "openai"
    try {
      getWorkoutAIProvider()
      expect.fail("Should have thrown")
    } catch (err) {
      expect(err instanceof AIProviderError).toBe(true)
      if (err instanceof AIProviderError) {
        expect(err.code).toBe("config")
      }
    }
  })

  it("error message mentions the unknown provider name", () => {
    process.env.AI_PROVIDER = "gemini"
    try {
      getWorkoutAIProvider()
      expect.fail("Should have thrown")
    } catch (err) {
      if (err instanceof AIProviderError) {
        expect(err.message).toContain("gemini")
      }
    }
  })
})
