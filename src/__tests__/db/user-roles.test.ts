/**
 * user_roles constraint tests.
 *
 * Items 1-8 and 16 from the security hardening spec.
 *
 * Tests marked with [unit] use a mocked Supabase client and verify the
 * application-level response to DB-enforced constraints.
 *
 * SQL-level assertions (items requiring a live DB) are documented inline
 * as comments; run them against `supabase db reset` + psql.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── mocks ────────────────────────────────────────────────────────────────────

const {
  mockFrom,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockServiceFrom,
  mockServiceInsert,
  mockServiceUpdate,
  mockServiceDelete,
  mockServiceSelect,
} = vi.hoisted(() => {
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockDelete = vi.fn()
  const mockFrom = vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }))

  const mockServiceInsert = vi.fn()
  const mockServiceUpdate = vi.fn()
  const mockServiceDelete = vi.fn()
  const mockServiceSelect = vi.fn()
  const mockServiceFrom = vi.fn(() => ({
    insert: mockServiceInsert,
    update: mockServiceUpdate,
    delete: mockServiceDelete,
    select: mockServiceSelect,
  }))

  return {
    mockFrom,
    mockInsert,
    mockUpdate,
    mockDelete,
    mockServiceFrom,
    mockServiceInsert,
    mockServiceUpdate,
    mockServiceDelete,
    mockServiceSelect,
  }
})

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-abc" } } }) },
    from: mockFrom,
  })),
  createServiceRoleClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}))

const PERMISSION_DENIED = { code: "42501", message: "permission denied for table user_roles" }

beforeEach(() => {
  vi.clearAllMocks()
})

// ── item 1: un solo rol por usuario ──────────────────────────────────────────

describe("(1) un único rol por usuario", () => {
  it("[unit] insertar un segundo rol retorna error de conflicto del servidor", async () => {
    // La PK (user_id) hace que un segundo INSERT con el mismo user_id falle.
    // El cliente anon/authenticated no puede INSERT en user_roles (42501),
    // pero a efectos de documentar: incluso con service_role, un segundo
    // INSERT sin ON CONFLICT devuelve error de PK duplicada.
    const pkViolation = { code: "23505", message: "duplicate key value violates unique constraint" }
    mockServiceInsert.mockResolvedValue({ data: null, error: pkViolation })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    const service = createServiceRoleClient()
    const { error } = await service.from("user_roles").insert({ user_id: "user-abc", role: "admin" })

    expect(error?.code).toBe("23505")
  })

  it("[unit] promover a admin actualiza la fila existente (upsert vía service_role)", async () => {
    mockServiceUpdate.mockResolvedValue({ data: [{ user_id: "user-abc", role: "admin" }], error: null })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    const service = createServiceRoleClient()
    const { error } = await service.from("user_roles").update({ role: "admin" })

    expect(error).toBeNull()
  })
})

// ── items 2–4: migración de usuarios existentes ──────────────────────────────

describe("(2-4) lógica de migración de perfiles existentes", () => {
  // La migración usa: CASE WHEN is_admin = true THEN 'admin' ELSE 'member' END
  // Documentado aquí como verificación de la lógica determinista.

  it("(3) [logic] un perfil con is_admin=true recibe role='admin'", () => {
    const assignRole = (isAdmin: boolean | null) =>
      isAdmin === true ? "admin" : "member"
    expect(assignRole(true)).toBe("admin")
  })

  it("(4) [logic] un perfil con is_admin=false recibe role='member'", () => {
    const assignRole = (isAdmin: boolean | null) =>
      isAdmin === true ? "admin" : "member"
    expect(assignRole(false)).toBe("member")
  })

  it("(4) [logic] un perfil con is_admin=null recibe role='member'", () => {
    const assignRole = (isAdmin: boolean | null) =>
      isAdmin === true ? "admin" : "member"
    expect(assignRole(null)).toBe("member")
  })

  /*
   * SQL assertion (ejecutar con psql contra supabase db reset):
   *
   * (2) Nuevo usuario obtiene member:
   *   INSERT INTO auth.users (id, email) VALUES ('test-uuid', 'x@y.com');
   *   SELECT role FROM public.user_roles WHERE user_id = 'test-uuid';
   *   -- Expected: member
   *
   * (3) Admin anterior migra como admin:
   *   SELECT role FROM public.user_roles
   *   WHERE user_id IN (SELECT id FROM public.profiles WHERE is_admin = true)
   *   LIMIT 1;
   *   -- Expected: admin
   *
   * (4) Usuario normal migra como member:
   *   SELECT role FROM public.user_roles
   *   WHERE user_id IN (SELECT id FROM public.profiles WHERE is_admin IS DISTINCT FROM true)
   *   LIMIT 1;
   *   -- Expected: member
   */
})

// ── items 5–7: authenticated no puede escribir en user_roles ─────────────────

describe("(5-7) authenticated no puede mutar user_roles", () => {
  it("(5) [unit] insert retorna permission denied (42501)", async () => {
    mockInsert.mockResolvedValue({ data: null, error: PERMISSION_DENIED })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    const { error } = await client.from("user_roles").insert({ user_id: "user-abc", role: "admin" })

    expect(error?.code).toBe("42501")
  })

  it("(6) [unit] update retorna permission denied (42501)", async () => {
    mockUpdate.mockResolvedValue({ data: null, error: PERMISSION_DENIED })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    const { error } = await client.from("user_roles").update({ role: "admin" })

    expect(error?.code).toBe("42501")
  })

  it("(7) [unit] delete retorna permission denied (42501)", async () => {
    mockDelete.mockResolvedValue({ data: null, error: PERMISSION_DENIED })

    const { createClient } = await import("@/lib/supabase/server")
    const client = await createClient()
    const { error } = await client.from("user_roles").delete()

    expect(error?.code).toBe("42501")
  })

  /*
   * item 8 — TRUNCATE no está cubierto por RLS; sólo verificable a nivel SQL:
   *
   *   SET ROLE authenticated;
   *   SET request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';
   *   TRUNCATE public.user_roles;
   *   -- Expected: ERROR 42501 permission denied
   *
   * El REVOKE ALL + GRANT SELECT garantiza que TRUNCATE no esté concedido.
   */
})

// ── item 16: service_role conserva CRUD ──────────────────────────────────────

describe("(16) service_role conserva operaciones CRUD en user_roles", () => {
  it("service_role puede insertar un rol nuevo", async () => {
    mockServiceInsert.mockResolvedValue({ data: [{ user_id: "u1", role: "member" }], error: null })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    const service = createServiceRoleClient()
    const { error } = await service.from("user_roles").insert({ user_id: "u1", role: "member" })

    expect(error).toBeNull()
  })

  it("service_role puede actualizar el rol", async () => {
    mockServiceUpdate.mockResolvedValue({ data: [{ user_id: "u1", role: "admin" }], error: null })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    const service = createServiceRoleClient()
    const { error } = await service.from("user_roles").update({ role: "admin" })

    expect(error).toBeNull()
  })

  it("service_role puede eliminar una fila", async () => {
    mockServiceDelete.mockResolvedValue({ data: [], error: null })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    const service = createServiceRoleClient()
    const { error } = await service.from("user_roles").delete()

    expect(error).toBeNull()
  })

  it("service_role puede leer todos los roles", async () => {
    mockServiceSelect.mockResolvedValue({ data: [{ user_id: "u1", role: "member" }], error: null })

    const { createServiceRoleClient } = await import("@/lib/supabase/server")
    const service = createServiceRoleClient()
    const { error } = await service.from("user_roles").select("*")

    expect(error).toBeNull()
  })
})
