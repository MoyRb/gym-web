import { describe, it, expect, vi, beforeEach } from "vitest"

const mockGetUser = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn(async () => Buffer.from("%PDF-1.4 test")),
}))

vi.mock("@/lib/pdf/resources-data", () => ({
  PDF_RESOURCE_AUDIT_BY_SLUG: new Map(),
}))

vi.mock("@/lib/pdf/resources", () => ({
  resolvePdfResourceBySlug: vi.fn(() => ({
    resource: { slug: "test-slug", title: "Test", description: "Desc", category: "rutinas" },
    normalizedSlug: "test-slug",
    via: "exact",
  })),
  buildFallbackPdfResource: vi.fn(),
  inferResourceCategoryFromSlug: vi.fn(() => "rutinas"),
}))

vi.mock("@/lib/pdf/template", () => ({
  createFitnessClubPdfDocument: vi.fn(() => ({})),
}))

import { GET } from "@/app/api/resources/[slug]/pdf/route"

const makeRequest = (slug: string) =>
  new Request(`http://localhost:3000/api/resources/${slug}/pdf`)

const makeParams = (slug: string): { params: Promise<{ slug: string }> } => ({
  params: Promise.resolve({ slug }),
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/resources/[slug]/pdf", () => {
  it("returns 401 when there is no authenticated session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const response = await GET(makeRequest("test-slug"), makeParams("test-slug"))
    expect(response.status).toBe(401)
  })

  it("returns 200 with application/pdf when session is valid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } })
    const response = await GET(makeRequest("test-slug"), makeParams("test-slug"))
    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("application/pdf")
  })
})
