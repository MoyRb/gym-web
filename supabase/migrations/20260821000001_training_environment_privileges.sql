-- =============================================================================
-- CORTE TRAINING 4 BUGFIX: Column-level privileges for training context fields
--
-- Context:
--   20260805000000_user_roles_and_privilege_hardening.sql revoked ALL privileges
--   on public.profiles from authenticated and rebuilt them column-by-column.
--   Only the columns listed in that migration received INSERT/UPDATE grants.
--
--   20260821000000_training_environment.sql added training_environment and
--   available_equipment AFTER the hardening migration, so authenticated never
--   received column-level INSERT/UPDATE on them — causing HTTP 403 / 42501
--   ("permission denied for table profiles") on every profile save that
--   included those fields.
--
-- Fix:
--   Grant the minimum required column-level privileges on the two new columns.
--   No table-wide INSERT or UPDATE is granted.
--   No other columns are affected.
--   is_admin remains write-protected for authenticated.
--   RLS policies are unchanged.
-- =============================================================================

GRANT INSERT (training_environment, available_equipment)
  ON public.profiles
  TO authenticated;

GRANT UPDATE (training_environment, available_equipment)
  ON public.profiles
  TO authenticated;

-- =============================================================================
-- Verification query (run manually after applying):
--
--   SELECT grantee, privilege_type, column_name
--   FROM information_schema.column_privileges
--   WHERE table_schema = 'public'
--     AND table_name   = 'profiles'
--     AND column_name  IN ('training_environment', 'available_equipment')
--   ORDER BY column_name, privilege_type;
--
-- Expected rows for grantee = 'authenticated':
--   available_equipment  | INSERT
--   available_equipment  | UPDATE
--   training_environment | INSERT
--   training_environment | UPDATE
--
-- Confirm is_admin does NOT appear in the result for authenticated.
-- =============================================================================
