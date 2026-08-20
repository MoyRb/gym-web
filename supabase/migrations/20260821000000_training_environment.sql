-- =============================================================================
-- CORTE TRAINING 4: Training Environment & Home Equipment
-- Adds training_environment and available_equipment columns to profiles.
--
-- Design decisions:
--   - training_environment is NULLABLE (no default) so existing users are not
--     silently assumed to train in a gym. The app requests this on next generation.
--   - available_equipment defaults to '{}' (empty array, not null).
--     NULL vs [] would be ambiguous; empty array = no equipment specified.
--   - DB constraint on training_environment ensures only valid values reach the DB.
--   - available_equipment values are validated at application level (fitness-data.ts)
--     and via the UI (only valid HomeEquipment options offered).
--   - No changes to existing rows (additive migration only).
--   - No RLS changes: existing profiles RLS allows users to read/write own profile.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS training_environment text
    CONSTRAINT profiles_training_environment_check
      CHECK (training_environment IS NULL OR training_environment IN ('gym', 'home', 'hybrid')),
  ADD COLUMN IF NOT EXISTS available_equipment text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.training_environment IS
  'Where the user primarily trains: gym | home | hybrid. '
  'NULL = not yet set (legacy users or new users who skipped this step). '
  'Only affects AI workout generation — does not change existing plans.';

COMMENT ON COLUMN public.profiles.available_equipment IS
  'Home equipment checklist. Only relevant when training_environment = ''home''. '
  'Valid values: bodyweight, dumbbell, barbell, bench, resistance_band, kettlebell, pullup_bar. '
  'Empty array = no equipment specified (prevents generating home routines until filled).';

-- Index for potential future analytics queries:
-- "what % of users train at gym vs home?"
CREATE INDEX IF NOT EXISTS profiles_training_environment_idx
  ON public.profiles (training_environment)
  WHERE training_environment IS NOT NULL;
