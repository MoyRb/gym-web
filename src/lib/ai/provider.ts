/**
 * AI Provider Factory
 *
 * Returns the configured WorkoutAIProvider based on AI_PROVIDER env variable.
 * Adding support for a new provider: add a case here. Workout Engine is unchanged.
 *
 * server-only.
 */

import "server-only"
import type { WorkoutAIProvider } from "./types"
import { AIProviderError } from "./types"
import { GroqWorkoutProvider } from "./providers/groq"

/**
 * Creates and returns the configured AI provider.
 *
 * Throws AIProviderError("config") if:
 * - AI_PROVIDER is set to an unknown value
 * - The provider requires a key that is not configured (e.g., GROQ_API_KEY missing)
 */
export function getWorkoutAIProvider(): WorkoutAIProvider {
  const providerName = process.env.AI_PROVIDER ?? "groq"

  switch (providerName) {
    case "groq":
      return new GroqWorkoutProvider()

    default:
      throw new AIProviderError(
        `Unknown AI_PROVIDER: "${providerName}". Supported values: groq`,
        "config",
      )
  }
}
