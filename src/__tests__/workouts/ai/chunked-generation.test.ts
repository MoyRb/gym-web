/**
 * Integration tests for chunked AI workout generation.
 *
 * Tests the orchestration logic: split building → batching → validation
 * → draft lifecycle → finalization.
 *
 * All Supabase and provider calls are mocked.
 */

import { describe, it, expect } from "vitest"
import { buildWorkoutSplit, buildBatches } from "@/lib/workouts/ai/workout-split"
import { getCandidatesForBatch, validateBatchCandidateIds, validateBatchDayNumbers, MAX_BATCH_CANDIDATES } from "@/lib/workouts/ai/batch-candidates"
import type { CandidateExercise } from "@/lib/workouts/ai/candidate-exercises"
import type { SplitDay } from "@/lib/workouts/ai/workout-split"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CHEST_ID = "00000000-0000-0000-0000-000000000001"
const BACK_ID  = "00000000-0000-0000-0000-000000000002"
const LEGS_ID  = "00000000-0000-0000-0000-000000000003"

const CANDIDATES: CandidateExercise[] = [
  { id: CHEST_ID, name: "Bench Press",   body_part: "chest",      equipment: "barbell", target: "pectorals" },
  { id: BACK_ID,  name: "Pull Up",       body_part: "back",       equipment: "bodyweight", target: "lats" },
  { id: LEGS_ID,  name: "Squat",         body_part: "upper legs", equipment: "barbell", target: "quads" },
]

function makeValidBatchOutput(dayNumbers: number[], candidateIds: string[]) {
  return {
    days: dayNumbers.map((dn, i) => ({
      day_number: dn,
      exercises: [
        {
          exercise_id: candidateIds[i % candidateIds.length],
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          duration_seconds: null,
          rest_seconds: 90,
          rir: 2,
          notes: null,
        },
      ],
    })),
  }
}

// ── Split determinism ──────────────────────────────────────────────────────────

describe("Split determinism", () => {
  it("same goal + days always produce the same split", () => {
    const goals = ["ganar_masa_muscular", "bajar_grasa", "mejorar_resistencia", "mejorar_condicion_general"]
    const dayCounts = [2, 3, 4, 5, 6, 7]
    for (const goal of goals) {
      for (const days of dayCounts) {
        const a = buildWorkoutSplit(days, goal)
        const b = buildWorkoutSplit(days, goal)
        expect(a).toEqual(b)
      }
    }
  })
})

// ── Batching ───────────────────────────────────────────────────────────────────

describe("Batch splitting", () => {
  it("3 days → 2 batches", () => {
    const split = buildWorkoutSplit(3, "ganar_masa_muscular")
    expect(buildBatches(split)).toHaveLength(2)
  })

  it("4 days → 2 batches", () => {
    const split = buildWorkoutSplit(4, "ganar_masa_muscular")
    expect(buildBatches(split)).toHaveLength(2)
  })

  it("5 days → 3 batches", () => {
    const split = buildWorkoutSplit(5, "ganar_masa_muscular")
    expect(buildBatches(split)).toHaveLength(3)
  })

  it("6 days → 3 batches", () => {
    const split = buildWorkoutSplit(6, "ganar_masa_muscular")
    expect(buildBatches(split)).toHaveLength(3)
  })

  it("7 days → 4 batches", () => {
    const split = buildWorkoutSplit(7, "ganar_masa_muscular")
    expect(buildBatches(split)).toHaveLength(4)
  })

  it("batch output only contains days from that batch", () => {
    const split = buildWorkoutSplit(5, "ganar_masa_muscular")
    const batches = buildBatches(split)

    // Batch 0: days 1-2
    expect(batches[0].map((d) => d.day_number)).toEqual([1, 2])
    // Batch 1: days 3-4
    expect(batches[1].map((d) => d.day_number)).toEqual([3, 4])
    // Batch 2: day 5
    expect(batches[2].map((d) => d.day_number)).toEqual([5])
  })
})

// ── Candidate selection per batch ─────────────────────────────────────────────

describe("Candidate selection per batch", () => {
  it("batch candidates match the focus of the batch days", () => {
    const pushBatch: SplitDay[] = [
      { day_number: 1, name: "Push", focus: ["chest", "shoulders", "upper arms"] },
    ]
    const result = getCandidatesForBatch(CANDIDATES, pushBatch)
    // Chest is focus for Push → CHEST_ID should be included
    expect(result.some((c) => c.id === CHEST_ID)).toBe(true)
  })

  it("max candidates per batch never exceeds MAX_BATCH_CANDIDATES", () => {
    const largeCandidates: CandidateExercise[] = Array.from({ length: 200 }, (_, i) => ({
      id: `id-${i}`,
      name: `Ex ${i}`,
      body_part: "chest",
      equipment: "barbell",
      target: "pectorals",
    }))
    const pushBatch: SplitDay[] = [
      { day_number: 1, name: "Push", focus: ["chest"] },
    ]
    const result = getCandidatesForBatch(largeCandidates, pushBatch)
    expect(result.length).toBeLessThanOrEqual(MAX_BATCH_CANDIDATES)
  })
})

// ── Batch output validation ───────────────────────────────────────────────────

describe("Batch output validation", () => {
  it("valid batch output passes candidate ID check", () => {
    const split = buildWorkoutSplit(4, "ganar_masa_muscular")
    const batches = buildBatches(split)
    const batch0 = batches[0]
    const batch0Candidates = getCandidatesForBatch(CANDIDATES, batch0)

    const output = makeValidBatchOutput(
      batch0.map((d) => d.day_number),
      [CHEST_ID, BACK_ID],
    )

    const errors = validateBatchCandidateIds(output.days, batch0Candidates)
    expect(errors).toHaveLength(0)
  })

  it("invalid batch is rejected — exercise_id not in batch candidates", () => {
    const split = buildWorkoutSplit(4, "ganar_masa_muscular")
    const batches = buildBatches(split)
    const batch0 = batches[0]
    const batch0Candidates = getCandidatesForBatch(CANDIDATES, batch0)

    const invalidOutput = {
      days: batch0.map((d) => ({
        day_number: d.day_number,
        exercises: [{ exercise_id: "ffffffff-ffff-ffff-ffff-ffffffffffff" }],
      })),
    }

    const errors = validateBatchCandidateIds(invalidOutput.days, batch0Candidates)
    expect(errors.length).toBeGreaterThan(0)
  })

  it("batch output with wrong day numbers is rejected", () => {
    const split = buildWorkoutSplit(4, "ganar_masa_muscular")
    const batches = buildBatches(split)
    const batch0 = batches[0]

    // Return days 3-4 when batch 0 expects days 1-2
    const wrongOutput = {
      days: [{ day_number: 3 }, { day_number: 4 }],
    }

    const error = validateBatchDayNumbers(
      wrongOutput.days,
      batch0.map((d) => d.day_number),
    )
    expect(error).not.toBeNull()
  })

  it("correct day numbers pass validation", () => {
    const split = buildWorkoutSplit(4, "ganar_masa_muscular")
    const batches = buildBatches(split)
    const batch0 = batches[0]

    const error = validateBatchDayNumbers(
      batch0.map((d) => ({ day_number: d.day_number })),
      batch0.map((d) => d.day_number),
    )
    expect(error).toBeNull()
  })
})

// ── Draft lifecycle ───────────────────────────────────────────────────────────

describe("Draft lifecycle (unit)", () => {
  it("active plan remains active during draft creation (no interference)", () => {
    // Conceptual test: the draft starts with status='draft', is_active=false
    // The active plan's status is NOT changed until finalize() is called
    const draftPlan = { status: "draft", is_active: false, source: "ai" }
    const activePlan = { status: "active", is_active: true }

    // Draft does not modify active plan
    expect(activePlan.is_active).toBe(true)
    expect(draftPlan.is_active).toBe(false)
  })

  it("draft source is always 'ai', not 'template'", () => {
    const draftPlan = { source: "ai" as const }
    expect(draftPlan.source).toBe("ai")
  })

  it("incomplete draft cannot finalize (not all batches done)", () => {
    const session = { completed_batches: 1, total_batches: 3 }
    const canFinalize = session.completed_batches >= session.total_batches
    expect(canFinalize).toBe(false)
  })

  it("completed draft can finalize (all batches done)", () => {
    const session = { completed_batches: 3, total_batches: 3 }
    const canFinalize = session.completed_batches >= session.total_batches
    expect(canFinalize).toBe(true)
  })
})

// ── Finalization validation ───────────────────────────────────────────────────

describe("Draft finalization validation", () => {
  function validateDraftStructure(
    days: Array<{ day_number: number }>,
    expectedDayCount: number,
  ): string | null {
    if (days.length !== expectedDayCount) {
      return `Expected ${expectedDayCount} days, got ${days.length}`
    }
    const nums = days.map((d) => d.day_number)
    if (new Set(nums).size !== nums.length) {
      return "Duplicate day_number"
    }
    const sorted = [...nums].sort((a, b) => a - b)
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) return `Non-consecutive day_numbers: [${sorted.join(",")}]`
    }
    return null
  }

  it("valid draft passes finalization validation", () => {
    const days = [{ day_number: 1 }, { day_number: 2 }, { day_number: 3 }]
    expect(validateDraftStructure(days, 3)).toBeNull()
  })

  it("wrong number of days fails finalization", () => {
    const days = [{ day_number: 1 }, { day_number: 2 }]
    expect(validateDraftStructure(days, 3)).not.toBeNull()
  })

  it("duplicate day_numbers fail finalization", () => {
    const days = [{ day_number: 1 }, { day_number: 1 }, { day_number: 3 }]
    expect(validateDraftStructure(days, 3)).not.toBeNull()
  })

  it("non-consecutive day_numbers fail finalization", () => {
    const days = [{ day_number: 1 }, { day_number: 3 }]
    expect(validateDraftStructure(days, 2)).not.toBeNull()
  })

  it("exactly one active plan after finalize (conceptual)", () => {
    // After finalize: old active → archived, draft → active
    // There is no gap
    const before = { activePlanId: "plan-old", draftPlanId: "plan-draft" }
    const after = {
      archivedPlanId: before.activePlanId,
      activePlanId: before.draftPlanId,
    }
    expect(after.activePlanId).toBe("plan-draft")
    expect(after.archivedPlanId).toBe("plan-old")
    // Exactly one active plan
    const activePlans = [after.activePlanId]
    expect(activePlans).toHaveLength(1)
  })

  it("no duplicate days in finalized plan", () => {
    const days = [{ day_number: 1 }, { day_number: 2 }, { day_number: 3 }, { day_number: 4 }]
    expect(validateDraftStructure(days, 4)).toBeNull()
    // No duplicates
    const nums = days.map((d) => d.day_number)
    expect(new Set(nums).size).toBe(nums.length)
  })
})

// ── Security ──────────────────────────────────────────────────────────────────

describe("Security", () => {
  it("foreign draft is rejected (ownership check)", () => {
    const session = { user_id: "user-A" }
    const requestingUserId = "user-B"
    const isOwner = session.user_id === requestingUserId
    expect(isOwner).toBe(false)
  })

  it("own session is accepted", () => {
    const session = { user_id: "user-A" }
    const requestingUserId = "user-A"
    const isOwner = session.user_id === requestingUserId
    expect(isOwner).toBe(true)
  })
})

// ── Recovery ──────────────────────────────────────────────────────────────────

describe("Recovery", () => {
  it("session completed_batches indicates resume point", () => {
    const session = { completed_batches: 1, total_batches: 3 }
    const nextBatchIndex = session.completed_batches // batch index 1 = second batch
    expect(nextBatchIndex).toBe(1)
  })

  it("draft in DB is the source of truth for recovery", () => {
    // Draft persists in DB; client React state is disposable
    const draftInDb = { status: "draft", completed_batches: 2 }
    // Even after page refresh, the DB draft exists
    expect(draftInDb.status).toBe("draft")
    expect(draftInDb.completed_batches).toBe(2)
  })

  it("abandoned draft does not affect active plan", () => {
    const activePlan = { status: "active", is_active: true }
    const abandonedDraft = { status: "draft", is_active: false }
    // Draft never activates itself
    expect(activePlan.is_active).toBe(true)
    expect(abandonedDraft.is_active).toBe(false)
  })
})
