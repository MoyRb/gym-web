-- =============================================================================
-- CORTE MONETIZATION 1: user_access
--
-- Stores explicit plan overrides for users.
-- NO ROW = FREE (default, no insert required).
-- Writes come from: Stripe webhook (future) or service-role admin scripts.
-- Authenticated users can SELECT own row only — no INSERT/UPDATE/DELETE.
-- =============================================================================

CREATE TABLE public.user_access (
  user_id     uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan        text        NOT NULL DEFAULT 'free'
                          CHECK (plan IN ('free', 'pro', 'founder')),
  source      text        NOT NULL DEFAULT 'default',
  valid_until timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_user_access_updated_at
  BEFORE UPDATE ON public.user_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own row only
CREATE POLICY "user_access_select_own"
  ON public.user_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE for authenticated or anon
-- Writes must come from service_role (webhooks, admin scripts)

-- ── Privileges ────────────────────────────────────────────────────────────────

REVOKE ALL PRIVILEGES ON TABLE public.user_access FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_access TO service_role;
GRANT SELECT                          ON TABLE public.user_access TO authenticated;

-- =============================================================================
-- HOW TO PROMOTE A USER TO PRO (for testing, no Stripe yet):
--
--   INSERT INTO public.user_access (user_id, plan, source)
--   VALUES ('<user-uuid>', 'pro', 'manual_test')
--   ON CONFLICT (user_id) DO UPDATE
--     SET plan = 'pro', source = 'manual_test', updated_at = now();
--
-- This must be run via service_role (Supabase SQL editor with service_role
-- context, or a local admin script). Never via browser/client.
-- =============================================================================
