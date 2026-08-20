-- ── analytics_events V2 ───────────────────────────────────────────────────────
-- Evolves analytics_events: contextual FK columns, dedupe_key, product analytics RPCs.
-- Depends on: 20260406100000_fitness_club_core.sql
-- NOT applied remotely — apply manually after team review.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. New columns (nullable / with defaults so existing rows are preserved)
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS schema_version     integer     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occurred_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS workout_session_id uuid        REFERENCES public.workout_sessions(id)  ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workout_plan_id    uuid        REFERENCES public.workout_plans(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exercise_id        uuid        REFERENCES public.exercises(id)          ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dedupe_key         text;

-- 2. Backfill occurred_at from created_at for pre-migration rows
UPDATE public.analytics_events
  SET occurred_at = created_at
  WHERE occurred_at > created_at OR occurred_at < created_at;
-- (rows inserted before this migration had DEFAULT now() for occurred_at,
--  so this only corrects truly older rows where occurred_at≠created_at)

-- 3. Unique partial index for idempotent event writes
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_dedupe_key_uidx
  ON public.analytics_events (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 4. Composite indexes optimised for product analytics queries
CREATE INDEX IF NOT EXISTS analytics_events_type_occurred_idx
  ON public.analytics_events (event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_user_occurred_idx
  ON public.analytics_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS analytics_events_session_idx
  ON public.analytics_events (workout_session_id)
  WHERE workout_session_id IS NOT NULL;

-- ── RPC: admin_get_product_stats ──────────────────────────────────────────────
-- Returns DAU/WAU/MAU + per-event counts in 24h/7d/30d windows.
-- Excludes legacy auth/setup events from engagement metric.

CREATE OR REPLACE FUNCTION public.admin_get_product_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  engagement AS (
    SELECT
      COUNT(DISTINCT CASE WHEN occurred_at >= now() - INTERVAL '1 day'   THEN user_id END) AS dau,
      COUNT(DISTINCT CASE WHEN occurred_at >= now() - INTERVAL '7 days'  THEN user_id END) AS wau,
      COUNT(DISTINCT CASE WHEN occurred_at >= now() - INTERVAL '30 days' THEN user_id END) AS mau
    FROM public.analytics_events
    WHERE user_id IS NOT NULL
      AND event_type NOT IN (
        'register', 'login', 'profile_completed',
        'routine_viewed', 'pdf_downloaded'
      )
  ),
  event_counts AS (
    SELECT
      event_type,
      COUNT(*) FILTER (WHERE occurred_at >= now() - INTERVAL '1 day')   AS c24h,
      COUNT(*) FILTER (WHERE occurred_at >= now() - INTERVAL '7 days')  AS c7d,
      COUNT(*) FILTER (WHERE occurred_at >= now() - INTERVAL '30 days') AS c30d,
      COUNT(*)                                                            AS total
    FROM public.analytics_events
    GROUP BY event_type
  )
  SELECT jsonb_build_object(
    'dau', (SELECT dau FROM engagement),
    'wau', (SELECT wau FROM engagement),
    'mau', (SELECT mau FROM engagement),
    'event_counts', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'event_type', event_type,
            'c24h',       c24h,
            'c7d',        c7d,
            'c30d',       c30d,
            'total',      total
          )
          ORDER BY total DESC
        )
        FROM event_counts
      ),
      '[]'::jsonb
    )
  )
$$;

REVOKE ALL ON FUNCTION public.admin_get_product_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_product_stats() TO service_role;

-- ── RPC: admin_get_funnel_stats ───────────────────────────────────────────────
-- Returns the user acquisition funnel: signup → profile → plan → session → completion.

CREATE OR REPLACE FUNCTION public.admin_get_funnel_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'signups', (
      SELECT COUNT(*) FROM auth.users
    ),
    'profiles', (
      SELECT COUNT(*)
      FROM public.profiles
      WHERE goal IS NOT NULL
        AND experience IS NOT NULL
        AND days_per_week IS NOT NULL
    ),
    'plans', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.workout_plans
      WHERE is_active = true
    ),
    'sessions', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.workout_sessions
    ),
    'completions', (
      SELECT COUNT(DISTINCT user_id)
      FROM public.workout_sessions
      WHERE status = 'completed'
    )
  )
$$;

REVOKE ALL ON FUNCTION public.admin_get_funnel_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_funnel_stats() TO service_role;
