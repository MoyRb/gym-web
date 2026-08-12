import { vi } from "vitest"

// Mock server-only so it doesn't throw in the test environment
vi.mock("server-only", () => ({}))
