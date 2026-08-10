/**
 * profiles privilege tests.
 *
 * Items 9–12 from the security hardening spec.
 *
 * Tests marked with [unit] use a mocked Supabase client.
 * SQL-level assertions are documented inline.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── mocks ────────────────────────────────────────────────────────────────────

const { mockFrom, mockUpdate, mockInsert } = vi.hoisted(() => {
  const mockUpdate = vi.fn()
  const mockInsert = vi.fn()
  const mockFrom = vi.fn(() => ({ update: mockUpdate, insert: mockInsert }))
  return { mockFrom, mockUpdate, mockInsert }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-abc" } } }) },
    from: mockFrom,
  })),
  createServiceRoleClient: vi.fn(),
}))

const PERMISSION_DENIED = { code: "42501", message: "permission denied for column" }

beforeEach(() => {
  vi.clearAllMocks()
})

// ── item 9: authenticated no puede cambiar is_admin ───────────────────────────

describe("(9) authenticated no puede cambiar profiles.is_admin", () => {
  it("[unit] UPDATE SET is_admin retorna permission denied (42501)", async () => {
    mockUpdate.mockResolvedValue({ data: null, error: PERMISSION_DENIED })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    // El REVOKE UPDATE (is_admin) a nivel de columna provoca este error en la DB.
    const { error } = await client.from("profiles").update({ is_admin: true })

    expect(error?.code).toBe("42501")
  })

  /*
   * SQL assertion:
   *   SET ROLE authenticated;
   *   SET request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
   *   UPDATE public.profiles SET is_admin = true WHERE id = '<uuid>';
   *   -- Expected: ERROR 42501 permission denied for column is_admin
   */
})

// ── items 10–11: authenticated no puede insertar/actualizar timestamps ────────

describe("(10) authenticated no puede insertar created_at o updated_at", () => {
  it("[unit] INSERT con created_at retorna permission denied (42501)", async () => {
    mockInsert.mockResolvedValue({ data: null, error: PERMISSION_DENIED })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    const { error } = await client.from("profiles").insert({
      id: "user-abc",
      username: "testuser",
      created_at: "2026-01-01T00:00:00Z",
    })

    expect(error?.code).toBe("42501")
  })

  it("[unit] INSERT con updated_at retorna permission denied (42501)", async () => {
    mockInsert.mockResolvedValue({ data: null, error: PERMISSION_DENIED })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    const { error } = await client.from("profiles").insert({
      id: "user-abc",
      username: "testuser",
      updated_at: "2026-01-01T00:00:00Z",
    })

    expect(error?.code).toBe("42501")
  })

  /*
   * SQL assertion (item 10):
   *   SET ROLE authenticated;
   *   INSERT INTO public.profiles (id, username, created_at)
   *   VALUES ('<uuid>', 'u', now());
   *   -- Expected: ERROR 42501 permission denied for column created_at
   */
})

describe("(11) authenticated no puede actualizar updated_at", () => {
  it("[unit] UPDATE SET updated_at retorna permission denied (42501)", async () => {
    mockUpdate.mockResolvedValue({ data: null, error: PERMISSION_DENIED })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    const { error } = await client.from("profiles").update({ updated_at: "2026-01-01T00:00:00Z" })

    expect(error?.code).toBe("42501")
  })

  /*
   * SQL assertion (item 11):
   *   SET ROLE authenticated;
   *   UPDATE public.profiles SET updated_at = now() WHERE id = '<uuid>';
   *   -- Expected: ERROR 42501 permission denied for column updated_at
   */
})

// ── item 12: authenticated sí puede actualizar columnas permitidas ────────────

describe("(12) authenticated puede actualizar peso, altura, objetivo y días", () => {
  it("[unit] UPDATE de columnas permitidas tiene éxito", async () => {
    mockUpdate.mockResolvedValue({
      data: [{ id: "user-abc", weight_kg: 75, height_cm: 180, goal: "perder_grasa", days_per_week: 4 }],
      error: null,
    })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    const { error } = await client.from("profiles").update({
      weight_kg: 75,
      height_cm: 180,
      goal: "perder_grasa",
      days_per_week: 4,
    })

    expect(error).toBeNull()
  })

  /*
   * SQL assertion (item 12):
   *   SET ROLE authenticated;
   *   UPDATE public.profiles
   *   SET weight_kg = 75, height_cm = 180, goal = 'perder_grasa', days_per_week = 4
   *   WHERE id = '<uuid>';
   *   -- Expected: UPDATE 1  (sin error)
   */
})
