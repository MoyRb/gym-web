# Equipment Engine — Training Context & Equipment Engine V1

## Overview

The equipment engine filters and scores exercises in the AI candidate pool based on where the user trains and what equipment they have. It operates in three layers:

1. **Normalization** — raw DB equipment strings → canonical `EquipmentCategory`
2. **Scoring** — deterministic score (0–100) per exercise per context
3. **Filtering** — hard exclusion for home incompatibilities

**Location:** `src/lib/workouts/equipment/`

---

## Types

### `TrainingEnvironment`
```ts
"gym" | "home" | "hybrid"
```
Stored in `profiles.training_environment`. `null` = legacy user (no preference set). Null triggers backward-compatible alphabetical sort — no equipment preference applied.

### `EquipmentCategory`
```
bodyweight | free_weight | cable | machine | smith | assisted | band | functional | cardio | other
```
Derived from the raw `exercises.equipment` string via `normalizeEquipment()`.

### `HomeEquipment`
```
bodyweight | dumbbell | barbell | bench | resistance_band | kettlebell | pullup_bar
```
User-facing checklist (profile UI). Stored in `profiles.available_equipment text[]`. `bench` and `pullup_bar` are secondary-only (unlock movements, not raw equipment types).

### `SelectionContext`
```ts
{
  environment: TrainingEnvironment
  availableEquipment: HomeEquipment[] | null   // null = gym (full access)
  experience: string                           // "principiante" | "intermedio" | "avanzado"
  goal: string                                 // "ganar_masa_muscular" | ...
}
```

---

## Normalization (`normalize-equipment.ts`)

`normalizeEquipment(raw: string): EquipmentCategory`

- Trims whitespace, lowercases
- Looks up in `RAW_TO_CATEGORY` (28+ known strings)
- Unknown → `"other"`

All known mappings:

| Raw string | Category |
|---|---|
| `body weight` | `bodyweight` |
| `dumbbell`, `barbell`, `ez barbell`, `olympic barbell`, `trap bar`, `weighted` | `free_weight` |
| `cable` | `cable` |
| `leverage machine`, `sled machine` | `machine` |
| `smith machine` | `smith` |
| `assisted` | `assisted` |
| `band`, `resistance band` | `band` |
| `kettlebell`, `medicine ball`, `rope`, `stability ball`, `bosu ball`, `tire`, `hammer` | `functional` |
| `stationary bike`, `skierg machine`, `upper body ergometer`, `stepmill machine`, `elliptical machine` | `cardio` |
| `roller`, `wheel roller` | `other` |

---

## Scoring (`equipment-score.ts`)

### GYM — soft ranking

Base scores (intermedio / ganar_masa_muscular baseline):

| Category | Base |
|---|---|
| `machine` | 85 |
| `cable` | 85 |
| `free_weight` | 80 |
| `smith` | 75 |
| `assisted` | 70 |
| `functional` | 55 |
| `other` | 45 |
| `cardio` | 40 |
| `bodyweight` | 35 |
| `band` | 20 |

**Experience modifiers (additive):**

| Category | principiante | intermedio | avanzado |
|---|---|---|---|
| `machine` | +15 | 0 | −5 |
| `assisted` | +15 | 0 | 0 |
| `smith` | +10 | 0 | 0 |
| `cable` | +5 | 0 | 0 |
| `free_weight` | −10 | 0 | +10 |
| `bodyweight` | 0 | 0 | +15 |

**Goal modifiers (additive, applied after experience):**

| Category | bajar_grasa | mejorar_resistencia | mejorar_condicion_general |
|---|---|---|---|
| `bodyweight` | +10 | +15 | +5 |
| `cardio` | +15 | +25 | +10 |
| `functional` | +10 | +15 | +5 |
| `band` | 0 | +10 | 0 |

`ganar_masa_muscular` uses base scores (no goal modifier).

Final score: `Math.max(0, Math.min(100, base + expMod + goalMod))`

### HOME — hard filter + neutral

- Exercises incompatible with `availableEquipment` return `HOME_EXCLUDE_SCORE = -9999` and are excluded from the candidate pool entirely
- Compatible exercises all return `50` (neutral — body_part priority drives variety)

**Compatibility rules (`isCompatibleWithHomeEquipment`):**
1. Exercise raw equipment must be in the allowed set from `HOME_EQUIPMENT_TO_RAW`
2. `"weighted"` raw: requires `bodyweight` AND (`dumbbell` OR `barbell`)
3. Bench-dependent names (`bench press`, `incline`, `decline`, `on bench`, `on a bench`): require `bench`
4. Pull-up-dependent names (`pull-up`, `pull up`, `chin-up`, `chin up`, `hanging`, `dead hang`, `bar hang`, `toes to bar`): require `pullup_bar`

**Home equipment → allowed raw strings:**

| HomeEquipment | Allows raw |
|---|---|
| `bodyweight` | `body weight` |
| `dumbbell` | `dumbbell` |
| `barbell` | `barbell`, `olympic barbell` |
| `bench` | *(secondary only — no raw type)* |
| `resistance_band` | `band`, `resistance band` |
| `kettlebell` | `kettlebell` |
| `pullup_bar` | *(secondary only — no raw type)* |

### HYBRID — gym scores + bodyweight/band/functional boost

Applies gym scoring then adds:

| Category | Hybrid boost |
|---|---|
| `bodyweight` | +10 |
| `band` | +10 |
| `functional` | +5 |

No hard filtering. All equipment accessible.

---

## Candidate Pool Integration (`candidate-exercises.ts`)

`selectCandidates(exercises, goal, context?)`:

1. Filter `is_active = true`
2. If `context.environment === "home"`: hard-filter incompatible exercises (score === HOME_EXCLUDE_SCORE)
3. Group by `body_part`
4. Sort within each group:
   - With context: `scoreExerciseForContext DESC`, then `name ASC`
   - Without context (undefined): `name ASC` only (legacy)
5. Allocate by priority (goal-specific body_part order + slot counts)
6. Cap at `MAX_CANDIDATES = 55`

---

## Bodyweight Balance Guard (`checkBodyweightBalance`)

For GYM environment, checks if selected exercises are bodyweight-dominant:
- Threshold: `BODYWEIGHT_GYM_THRESHOLD_PCT = 0.30`
- `isImbalanced = ratio > 0.30` (strict greater-than)
- Only meaningful for gym; always returns `isImbalanced: false` for home/hybrid

Used as a logging/alerting guardrail. V1 does not block generation — it flags the plan.

---

## Profile Data Model

**DB columns** (migration `20260821000000_training_environment.sql`):
```sql
training_environment text NULL  -- 'gym' | 'home' | 'hybrid' | NULL
available_equipment  text[] NOT NULL DEFAULT '{}'
```

**`UserProfile` fields:**
```ts
entorno: TrainingEnvironment | null
equipo_disponible: HomeEquipment[] | null
```

**`toUserProfile`/`toProfileInsert`** in `src/lib/fitness-data.ts` handles mapping between DB row and domain type, including sanitization of `available_equipment` against `HOME_EQUIPMENT_VALUES`.

---

## Privacy

- `training_environment` and `available_equipment` are passed to the AI candidate scoring engine only (no PII)
- `SelectionProfile` sent to Qwen includes `training_environment` (string | null) only — no equipment list
- Candidate format in the AI prompt includes `equipment` column so the model can reason about context

---

## Tests

| File | Coverage |
|---|---|
| `src/__tests__/workouts/equipment/normalize-equipment.test.ts` | All 28+ raw strings, unknown fallback, case-insensitivity, whitespace trim |
| `src/__tests__/workouts/equipment/equipment-score.test.ts` | `isCompatibleWithHomeEquipment` (all rules), `scoreExerciseForContext` (gym base/exp/goal, home, hybrid), `checkBodyweightBalance` |
| `src/__tests__/workouts/ai/candidate-exercises.test.ts` | Home hard filter, gym ranking (machine > bodyweight), hybrid, backward compat |
