-- =============================================================================
-- CORTE ADMIN 1: Analytics Foundation
-- Funciones RPC para el Alpha Trainer Internal Analytics Dashboard.
-- Todas son SECURITY DEFINER, callable solo por service_role.
-- Depende de: 20260817000000_ai_generation_sessions.sql
-- NO aplicar remotamente sin revisión.
-- Date: 2026-08-19
-- =============================================================================

-- ============================================================
-- 1. Índices adicionales para queries analíticas
-- ============================================================

-- Permite filtrar perfiles nuevos por fecha
CREATE INDEX IF NOT EXISTS profiles_created_at_idx
  ON public.profiles (created_at DESC);

-- Permite filtrar sesiones completadas por fecha fácilmente
CREATE INDEX IF NOT EXISTS workout_sessions_status_started_idx
  ON public.workout_sessions (status, started_at DESC);

-- Permite agrupar generaciones por status
CREATE INDEX IF NOT EXISTS ai_generation_sessions_status_idx
  ON public.ai_generation_sessions (status);

-- Permite agrupar planes por source+status para analytics
CREATE INDEX IF NOT EXISTS workout_plans_source_status_idx
  ON public.workout_plans (source, status);

-- ============================================================
-- 2. admin_get_overview_stats()
--    KPIs globales del Overview dashboard.
--    Definición de "active user": usuario con al menos una
--    workout_session (cualquier status) en el periodo.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_overview_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    -- ── Usuarios ──────────────────────────────────────────
    'total_users',
    (SELECT COUNT(*) FROM public.profiles),

    'new_users_7d',
    (SELECT COUNT(*) FROM public.profiles
     WHERE created_at >= now() - interval '7 days'),

    'new_users_30d',
    (SELECT COUNT(*) FROM public.profiles
     WHERE created_at >= now() - interval '30 days'),

    -- active user = usuario con al menos 1 workout_session en el periodo
    'active_users_7d',
    (SELECT COUNT(DISTINCT user_id) FROM public.workout_sessions
     WHERE started_at >= now() - interval '7 days'),

    'active_users_30d',
    (SELECT COUNT(DISTINCT user_id) FROM public.workout_sessions
     WHERE started_at >= now() - interval '30 days'),

    -- ── Sesiones ──────────────────────────────────────────
    'sessions_total',
    (SELECT COUNT(*) FROM public.workout_sessions),

    'sessions_completed',
    (SELECT COUNT(*) FROM public.workout_sessions
     WHERE status = 'completed'),

    'sessions_in_progress',
    (SELECT COUNT(*) FROM public.workout_sessions
     WHERE status = 'in_progress'),

    'sessions_7d',
    (SELECT COUNT(*) FROM public.workout_sessions
     WHERE started_at >= now() - interval '7 days'),

    'sessions_30d',
    (SELECT COUNT(*) FROM public.workout_sessions
     WHERE started_at >= now() - interval '30 days'),

    'sessions_completed_7d',
    (SELECT COUNT(*) FROM public.workout_sessions
     WHERE status = 'completed'
       AND started_at >= now() - interval '7 days'),

    'sessions_completed_30d',
    (SELECT COUNT(*) FROM public.workout_sessions
     WHERE status = 'completed'
       AND started_at >= now() - interval '30 days'),

    'avg_duration_seconds',
    (SELECT ROUND(AVG(duration_seconds))
     FROM public.workout_sessions
     WHERE status = 'completed'
       AND duration_seconds IS NOT NULL),

    -- ── Planes ────────────────────────────────────────────
    'plans_ai',
    (SELECT COUNT(*) FROM public.workout_plans
     WHERE source = 'ai' AND status IN ('active', 'archived')),

    'plans_template',
    (SELECT COUNT(*) FROM public.workout_plans
     WHERE source = 'template'),

    'plans_manual',
    (SELECT COUNT(*) FROM public.workout_plans
     WHERE source = 'manual'),

    'plans_draft',
    (SELECT COUNT(*) FROM public.workout_plans
     WHERE status = 'draft'),

    -- ── AI Generations ────────────────────────────────────
    'ai_gen_total',
    (SELECT COUNT(*) FROM public.ai_generation_sessions),

    'ai_gen_completed',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'completed'),

    'ai_gen_failed',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'failed'),

    'ai_gen_in_progress',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'in_progress'),

    'ai_gen_cancelled',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'cancelled')
  );
$$;

-- ============================================================
-- 3. admin_get_daily_trend(p_days)
--    Serie temporal diaria: nuevos usuarios, sesiones.
--    Retorna una fila por día, incluyendo días con cero datos.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_daily_trend(
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  day              date,
  new_users        bigint,
  sessions_started bigint,
  sessions_completed bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT generate_series(
      (now() - (p_days - 1) * interval '1 day')::date,
      now()::date,
      interval '1 day'
    )::date AS day
  ),
  user_counts AS (
    SELECT created_at::date AS day, COUNT(*) AS cnt
    FROM public.profiles
    WHERE created_at >= now() - p_days * interval '1 day'
    GROUP BY 1
  ),
  sessions_started AS (
    SELECT started_at::date AS day, COUNT(*) AS cnt
    FROM public.workout_sessions
    WHERE started_at >= now() - p_days * interval '1 day'
    GROUP BY 1
  ),
  sessions_done AS (
    SELECT started_at::date AS day, COUNT(*) AS cnt
    FROM public.workout_sessions
    WHERE status = 'completed'
      AND started_at >= now() - p_days * interval '1 day'
    GROUP BY 1
  )
  SELECT
    d.day,
    COALESCE(u.cnt,  0) AS new_users,
    COALESCE(ss.cnt, 0) AS sessions_started,
    COALESCE(sd.cnt, 0) AS sessions_completed
  FROM date_series d
  LEFT JOIN user_counts    u  ON u.day  = d.day
  LEFT JOIN sessions_started ss ON ss.day = d.day
  LEFT JOIN sessions_done   sd ON sd.day = d.day
  ORDER BY d.day;
$$;

-- ============================================================
-- 4. admin_get_training_stats()
--    Top ejercicios, body parts, targets.
--    Promedios por sesión.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_training_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(

    'top_exercises_by_sessions',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          e.id,
          e.name,
          e.body_part,
          e.equipment,
          COUNT(wse.id) AS session_count
        FROM public.workout_session_exercises wse
        JOIN public.exercises e ON e.id = wse.exercise_id
        GROUP BY e.id, e.name, e.body_part, e.equipment
        ORDER BY session_count DESC
        LIMIT 10
      ) t
    ),

    'top_exercises_by_sets',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          e.id,
          e.name,
          e.body_part,
          e.equipment,
          COUNT(wst.id) AS completed_sets
        FROM public.workout_sets wst
        JOIN public.workout_session_exercises wse
          ON wse.id = wst.workout_session_exercise_id
        JOIN public.exercises e ON e.id = wse.exercise_id
        WHERE wst.completed = true
        GROUP BY e.id, e.name, e.body_part, e.equipment
        ORDER BY completed_sets DESC
        LIMIT 10
      ) t
    ),

    'top_body_parts',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          e.body_part,
          COUNT(wse.id) AS session_count
        FROM public.workout_session_exercises wse
        JOIN public.exercises e ON e.id = wse.exercise_id
        GROUP BY e.body_part
        ORDER BY session_count DESC
      ) t
    ),

    'top_targets',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          e.target,
          COUNT(wse.id) AS session_count
        FROM public.workout_session_exercises wse
        JOIN public.exercises e ON e.id = wse.exercise_id
        GROUP BY e.target
        ORDER BY session_count DESC
        LIMIT 15
      ) t
    ),

    'avg_exercises_per_session',
    (
      SELECT ROUND(AVG(ex_count), 1)
      FROM (
        SELECT workout_session_id, COUNT(*) AS ex_count
        FROM public.workout_session_exercises
        GROUP BY workout_session_id
      ) t
    ),

    'avg_sets_per_completed_session',
    (
      SELECT ROUND(AVG(set_count), 1)
      FROM (
        SELECT ws.id, COUNT(wst.id) AS set_count
        FROM public.workout_sessions ws
        JOIN public.workout_session_exercises wse
          ON wse.workout_session_id = ws.id
        JOIN public.workout_sets wst
          ON wst.workout_session_exercise_id = wse.id
        WHERE ws.status = 'completed'
          AND wst.completed = true
        GROUP BY ws.id
      ) t
    )
  );
$$;

-- ============================================================
-- 5. admin_get_equipment_stats()
--    Intelligence de equipamiento: uso, usuarios, series,
--    share, crecimiento 30d vs 30d anterior.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_equipment_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_stats AS (
    SELECT
      e.equipment,
      COUNT(DISTINCT ws.id)                AS session_occurrences,
      COUNT(DISTINCT ws.user_id)           AS unique_users,
      COUNT(wst.id) FILTER (WHERE wst.completed = true) AS completed_sets,
      COUNT(DISTINCT CASE
        WHEN ws.started_at >= now() - interval '30 days'
        THEN ws.id END)                    AS sessions_30d,
      COUNT(DISTINCT CASE
        WHEN ws.started_at >= now() - interval '60 days'
         AND ws.started_at <  now() - interval '30 days'
        THEN ws.id END)                    AS sessions_prev_30d
    FROM public.workout_session_exercises wse
    JOIN public.exercises e  ON e.id  = wse.exercise_id
    JOIN public.workout_sessions ws ON ws.id = wse.workout_session_id
    LEFT JOIN public.workout_sets wst
      ON wst.workout_session_exercise_id = wse.id
    GROUP BY e.equipment
  ),
  totals AS (
    SELECT COUNT(*) AS total_sessions FROM public.workout_sessions
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'equipment',           a.equipment,
        'session_occurrences', a.session_occurrences,
        'unique_users',        a.unique_users,
        'completed_sets',      a.completed_sets,
        'share_pct',           ROUND(
                                 a.session_occurrences * 100.0
                                 / NULLIF(t.total_sessions, 0), 1),
        'sessions_30d',        a.sessions_30d,
        'sessions_prev_30d',   a.sessions_prev_30d,
        'growth_pct',          CASE
          WHEN a.sessions_prev_30d = 0 THEN NULL
          ELSE ROUND(
            (a.sessions_30d - a.sessions_prev_30d) * 100.0
            / a.sessions_prev_30d, 1)
        END
      )
      ORDER BY a.session_occurrences DESC
    ),
    '[]'::jsonb
  )
  FROM all_stats a
  CROSS JOIN totals t;
$$;

-- ============================================================
-- 6. admin_get_ai_stats()
--    Operaciones de AI: generaciones, tasas, tiempos,
--    distribución por objetivo / experiencia / días.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_ai_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(

    'total',
    (SELECT COUNT(*) FROM public.ai_generation_sessions),

    'completed',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'completed'),

    'failed',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'failed'),

    'in_progress',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'in_progress'),

    'cancelled',
    (SELECT COUNT(*) FROM public.ai_generation_sessions
     WHERE status = 'cancelled'),

    'avg_batches_completed',
    (SELECT ROUND(AVG(completed_batches), 1)
     FROM public.ai_generation_sessions
     WHERE status = 'completed'),

    'avg_completion_seconds',
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))))
     FROM public.ai_generation_sessions
     WHERE status = 'completed'
       AND updated_at > created_at),

    -- Para estos breakdowns, usamos draft_plan_id → workout_plans
    -- (draft_plan_id puede ser NULL si el plan fue eliminado)
    'by_goal',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT wp.goal, COUNT(ags.id) AS count
        FROM public.ai_generation_sessions ags
        JOIN public.workout_plans wp ON wp.id = ags.draft_plan_id
        WHERE ags.status = 'completed'
        GROUP BY wp.goal
      ) t
    ),

    'by_experience',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT wp.experience, COUNT(ags.id) AS count
        FROM public.ai_generation_sessions ags
        JOIN public.workout_plans wp ON wp.id = ags.draft_plan_id
        WHERE ags.status = 'completed'
        GROUP BY wp.experience
      ) t
    ),

    'by_days_per_week',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.days_per_week), '[]'::jsonb)
      FROM (
        SELECT wp.days_per_week, COUNT(ags.id) AS count
        FROM public.ai_generation_sessions ags
        JOIN public.workout_plans wp ON wp.id = ags.draft_plan_id
        WHERE ags.status = 'completed'
        GROUP BY wp.days_per_week
      ) t
    )
  );
$$;

-- ============================================================
-- 7. admin_get_user_stats()
--    Distribuciones de usuarios: objetivo, experiencia,
--    días/semana, sexo, roles.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(

    'total_users',
    (SELECT COUNT(*) FROM public.profiles),

    'users_with_active_plan',
    (SELECT COUNT(DISTINCT user_id) FROM public.workout_plans
     WHERE is_active = true),

    'users_with_any_session',
    (SELECT COUNT(DISTINCT user_id) FROM public.workout_sessions),

    'by_goal',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT goal, COUNT(*) AS count
        FROM public.profiles
        WHERE goal IS NOT NULL
        GROUP BY goal
      ) t
    ),

    'by_experience',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT experience, COUNT(*) AS count
        FROM public.profiles
        WHERE experience IS NOT NULL
        GROUP BY experience
      ) t
    ),

    'by_days_per_week',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.days_per_week), '[]'::jsonb)
      FROM (
        SELECT days_per_week, COUNT(*) AS count
        FROM public.profiles
        WHERE days_per_week IS NOT NULL
        GROUP BY days_per_week
      ) t
    ),

    'by_sex',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT sex, COUNT(*) AS count
        FROM public.profiles
        WHERE sex IS NOT NULL
        GROUP BY sex
      ) t
    ),

    'by_role',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.count DESC), '[]'::jsonb)
      FROM (
        SELECT role, COUNT(*) AS count
        FROM public.user_roles
        GROUP BY role
      ) t
    )
  );
$$;

-- ============================================================
-- 8. Privilegios: solo service_role puede ejecutar estas funciones.
--    No son accesibles desde el browser (sin service_role key).
-- ============================================================
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_get_overview_stats()',
    'public.admin_get_training_stats()',
    'public.admin_get_equipment_stats()',
    'public.admin_get_ai_stats()',
    'public.admin_get_user_stats()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;

REVOKE ALL   ON FUNCTION public.admin_get_daily_trend(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_daily_trend(integer)
  TO service_role;

-- ============================================================
-- NOTE: Alter function owners to postgres for consistency
-- ============================================================
ALTER FUNCTION public.admin_get_overview_stats()     OWNER TO postgres;
ALTER FUNCTION public.admin_get_daily_trend(integer) OWNER TO postgres;
ALTER FUNCTION public.admin_get_training_stats()     OWNER TO postgres;
ALTER FUNCTION public.admin_get_equipment_stats()    OWNER TO postgres;
ALTER FUNCTION public.admin_get_ai_stats()           OWNER TO postgres;
ALTER FUNCTION public.admin_get_user_stats()         OWNER TO postgres;
