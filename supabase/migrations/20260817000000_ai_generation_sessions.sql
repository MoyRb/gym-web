-- ──────────────────────────────────────────────────────────────────────────────
-- AI Generation Sessions
--
-- Tracks state of chunked AI workout generation.
-- Each row represents one multi-batch generation process.
-- Orphaned draft plans (abandoned sessions) do not affect the active plan.
-- Applied manually — do NOT apply automatically.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_generation_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_plan_id   UUID        REFERENCES public.workout_plans(id) ON DELETE SET NULL,

  -- Generation state
  status          TEXT        NOT NULL DEFAULT 'in_progress'
                              CHECK (status IN ('in_progress', 'completed', 'failed', 'cancelled')),
  total_batches   INTEGER     NOT NULL CHECK (total_batches > 0),
  completed_batches INTEGER   NOT NULL DEFAULT 0 CHECK (completed_batches >= 0),

  -- Serialized split and full candidate set so subsequent batches are
  -- computed deterministically server-side without re-querying the DB.
  split_json      JSONB       NOT NULL,
  candidates_json JSONB       NOT NULL,

  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_generation_sessions_user_id_idx
  ON public.ai_generation_sessions(user_id);

-- RLS: service role (used by all API routes) bypasses this automatically.
-- The policy exists so the authenticated role cannot read other users' sessions
-- if accessed directly.
ALTER TABLE public.ai_generation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation sessions"
  ON public.ai_generation_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- finalize_ai_draft
--
-- Atomically:
--   1. Archives the current active plan (if any).
--   2. Activates the draft plan.
--
-- There is NEVER a window where zero active plans exist for the user.
-- Fails if the draft plan does not belong to p_user_id or is not in
-- draft/is_active=false state.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.finalize_ai_draft(
  p_user_id       UUID,
  p_draft_plan_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_active_id UUID;
  v_new_version   INTEGER;
BEGIN
  -- 1. Verify ownership and draft status
  IF NOT EXISTS (
    SELECT 1
    FROM public.workout_plans
    WHERE id        = p_draft_plan_id
      AND user_id   = p_user_id
      AND status    = 'draft'
      AND is_active = false
  ) THEN
    RAISE EXCEPTION
      'Draft plan not found, not owned by user, or not in draft status: %',
      p_draft_plan_id;
  END IF;

  -- 2. Find current active plan (there should be at most one)
  SELECT id INTO v_old_active_id
  FROM public.workout_plans
  WHERE user_id   = p_user_id
    AND is_active = true
    AND status    = 'active'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- 3. Determine next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM public.workout_plans
  WHERE user_id = p_user_id;

  -- 4. Archive old active plan
  IF v_old_active_id IS NOT NULL THEN
    UPDATE public.workout_plans
    SET status    = 'archived',
        is_active = false,
        updated_at = NOW()
    WHERE id = v_old_active_id;
  END IF;

  -- 5. Activate draft — atomic swap
  UPDATE public.workout_plans
  SET status    = 'active',
      is_active = true,
      version   = v_new_version,
      updated_at = NOW()
  WHERE id = p_draft_plan_id;

  RETURN p_draft_plan_id;
END;
$$;
