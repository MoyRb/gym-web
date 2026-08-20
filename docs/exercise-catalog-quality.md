# Exercise Catalog Quality Notes

## Source

The exercise catalog is sourced from the `hasaneyldrm/exercises-dataset` (GymVisual). It contains ~1324 exercises with the following relevant columns:

- `name` — exercise name (English)
- `body_part` — anatomical group (e.g., `back`, `chest`, `upper legs`)
- `equipment` — raw equipment string (see normalization table below)
- `target` — primary muscle target
- `is_active` — whether the exercise appears in the app

---

## Equipment Coverage

### Known `equipment` values in the dataset

| Raw string | Normalized category | Exercises (approx) |
|---|---|---|
| `body weight` | `bodyweight` | ~200 |
| `dumbbell` | `free_weight` | ~200 |
| `barbell` | `free_weight` | ~150 |
| `cable` | `cable` | ~150 |
| `leverage machine` | `machine` | ~100 |
| `band` | `band` | ~80 |
| `kettlebell` | `functional` | ~40 |
| `assisted` | `assisted` | ~30 |
| `medicine ball` | `functional` | ~25 |
| `smith machine` | `smith` | ~20 |
| `resistance band` | `band` | ~15 |
| `ez barbell` | `free_weight` | ~15 |
| `olympic barbell` | `free_weight` | ~10 |
| `stability ball` | `functional` | ~10 |
| `roller` | `other` | ~10 |
| `rope` | `functional` | ~8 |
| `sled machine` | `machine` | ~8 |
| `stationary bike` | `cardio` | ~5 |
| `trap bar` | `free_weight` | ~5 |
| `bosu ball` | `functional` | ~5 |
| `weighted` | `free_weight` | ~5 |
| `elliptical machine` | `cardio` | ~4 |
| `skierg machine` | `cardio` | ~4 |
| `stepmill machine` | `cardio` | ~4 |
| `upper body ergometer` | `cardio` | ~3 |
| `wheel roller` | `other` | ~3 |
| `tire` | `functional` | ~2 |
| `hammer` | `functional` | ~2 |

Counts are approximate. New dataset versions may add equipment strings not listed here. Unknown strings normalize to `other`.

---

## Known Quality Issues

### Bodyweight exercises tagged as `body weight`
The dataset uses `"body weight"` (two words with a space). This differs from the common spelling "bodyweight" (one word). `normalizeEquipment` handles this explicitly.

### `weighted` tag
Some exercises (e.g., weighted dips, weighted pull-ups) use the raw string `"weighted"`. These are free-weight-equivalent exercises performed with added load. In the home filter, `weighted` requires `bodyweight` + (`dumbbell` OR `barbell`) in the user's available equipment.

### Secondary dependency inference (V1 heuristics)
The dataset does not encode secondary equipment dependencies (e.g., a bench for bench press). The engine infers these via name pattern matching:
- Bench-dependent: `bench press`, `incline`, `decline`, ` on bench`, `on a bench`
- Pull-up-dependent: `pull-up`, `pull up`, `chin-up`, `chin up`, `hanging`, `dead hang`, `bar hang`, `toes to bar`

These are conservative V1 heuristics. False negatives (including a bench-required exercise that doesn't match a pattern) are preferred over false positives (excluding a valid floor movement).

### EZ bar and trap bar
These are valid home equipment options but are not in the V1 `HomeEquipment` UI checklist. Exercises using `ez barbell` or `trap bar` will be excluded for home users. This is a known V1 limitation — add to the checklist in a future iteration.

### `medicine ball`, `rope`, `stability ball`, `bosu ball`, `tire`, `hammer`
These functional items are available in some gyms but rare at home. They are not in the `HomeEquipment` checklist. Home users will not see exercises using these items.

---

## Body Part Coverage

Body parts in the dataset and their priority treatment by goal:

| Body part | Notes |
|---|---|
| `back` | Highest priority for `ganar_masa_muscular` |
| `chest` | Second tier for hypertrophy |
| `upper legs` | Highest priority for fat loss / endurance |
| `shoulders` | Third–fourth tier across goals |
| `upper arms` | Fifth tier (biceps/triceps) |
| `waist` | Includes abs and core |
| `lower legs` | Calves, tibialis |
| `lower arms` | Forearms |
| `cardio` | Low priority for hypertrophy; high for endurance |
| `neck` | Lowest priority across all goals |

Body parts not in any goal priority list receive up to 2 slots in the second pass of `selectCandidates`.

---

## Candidate Pool Caps

| Constant | Value |
|---|---|
| `MAX_CANDIDATES` | 55 |
| `MAX_BATCH_CANDIDATES` | 35 |
| `SLOTS_PER_RANK` | 9, 8, 7, 6, 6, 5, 4, 4, 3, 3, 2, 2, 1 |

The slot allocation intentionally exceeds 55 — the hard cap enforces the final limit.

---

## Future Improvements

- Add EZ bar and trap bar to `HomeEquipment` checklist
- Secondary dependency: machine exercises that share names with bodyweight variants (e.g., "Machine Fly" vs "Dumbbell Fly")
- Crowdsourced quality flags (incorrect body_part, duplicate exercises)
- Per-exercise bodyweight flag to improve the balance guard accuracy
