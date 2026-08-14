-- =============================================================================
-- CORTE 2C: Workout Engine estructurado
-- Tablas: workout_plans + workout_plan_days + workout_plan_exercises
-- RPC:    create_workout_plan (transaccional, SECURITY DEFINER)
-- Date:   2026-08-13
-- =============================================================================

-- ============================================================
-- 0. Prerequisitos
--    set_updated_at() ya existe desde la migración core.
-- ============================================================

-- ============================================================
-- 1. workout_plans
--    Un usuario puede tener múltiples planes históricos.
--    Solo uno puede tener is_active = true.
-- ============================================================
CREATE TABLE public.workout_plans (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  goal          text        NOT NULL,
  experience    text        NOT NULL,
  days_per_week integer     NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  source        text        NOT NULL DEFAULT 'template'
                            CHECK (source IN ('template', 'manual', 'ai')),
  status        text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'archived')),
  version       integer     NOT NULL DEFAULT 1,
  is_active     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_plans_goal_check CHECK (goal IN (
    'ganar_masa_muscular',
    'bajar_grasa',
    'mejorar_resistencia',
    'mejorar_condicion_general'
  )),
  CONSTRAINT workout_plans_experience_check CHECK (experience IN (
    'principiante',
    'intermedio',
    'avanzado'
  ))
);

CREATE TRIGGER set_workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX workout_plans_user_id_idx       ON public.workout_plans (user_id);
CREATE INDEX workout_plans_user_active_idx   ON public.workout_plans (user_id, is_active);
CREATE INDEX workout_plans_status_idx        ON public.workout_plans (status);

-- ============================================================
-- 2. workout_plan_days
--    Constraint UNIQUE (workout_plan_id, day_number) evita
--    duplicados de número de día dentro del mismo plan.
-- ============================================================
CREATE TABLE public.workout_plan_days (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id uuid        NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  day_number      integer     NOT NULL CHECK (day_number > 0),
  name            text        NOT NULL,
  description     text,
  sort_order      integer     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_plan_days_unique_day UNIQUE (workout_plan_id, day_number)
);

CREATE TRIGGER set_workout_plan_days_updated_at
  BEFORE UPDATE ON public.workout_plan_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX workout_plan_days_plan_idx      ON public.workout_plan_days (workout_plan_id);
CREATE INDEX workout_plan_days_sort_idx      ON public.workout_plan_days (workout_plan_id, sort_order);

-- ============================================================
-- 3. workout_plan_exercises
--    exercise_id → public.exercises (no duplicar nombre/metadata).
--    reps_min / reps_max nullable para ejercicios por tiempo.
--    duration_seconds nullable para ejercicios por reps.
-- ============================================================
CREATE TABLE public.workout_plan_exercises (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_day_id uuid        NOT NULL REFERENCES public.workout_plan_days(id) ON DELETE CASCADE,
  exercise_id         uuid        NOT NULL REFERENCES public.exercises(id),
  sort_order          integer     NOT NULL,
  sets                integer     NOT NULL CHECK (sets > 0),
  reps_min            integer     CHECK (reps_min > 0),
  reps_max            integer     CHECK (reps_max > 0),
  duration_seconds    integer     CHECK (duration_seconds > 0),
  rest_seconds        integer     NOT NULL DEFAULT 60 CHECK (rest_seconds >= 0),
  rir                 integer     CHECK (rir >= 0),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_workout_plan_exercises_updated_at
  BEFORE UPDATE ON public.workout_plan_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX workout_plan_exercises_day_idx  ON public.workout_plan_exercises (workout_plan_day_id);
CREATE INDEX workout_plan_exercises_sort_idx ON public.workout_plan_exercises (workout_plan_day_id, sort_order);
CREATE INDEX workout_plan_exercises_ex_idx   ON public.workout_plan_exercises (exercise_id);

-- ============================================================
-- 4. RLS: workout_plans
--    authenticated: CRUD sobre planes propios únicamente.
--    anon:          sin acceso.
-- ============================================================
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_plans_select_own"
  ON public.workout_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "workout_plans_insert_own"
  ON public.workout_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workout_plans_update_own"
  ON public.workout_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "workout_plans_delete_own"
  ON public.workout_plans FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. RLS: workout_plan_days
--    Solo si el workout_plan pertenece al usuario.
-- ============================================================
ALTER TABLE public.workout_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_plan_days_select_own"
  ON public.workout_plan_days FOR SELECT TO authenticated
  USING (
    workout_plan_id IN (
      SELECT id FROM public.workout_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_plan_days_insert_own"
  ON public.workout_plan_days FOR INSERT TO authenticated
  WITH CHECK (
    workout_plan_id IN (
      SELECT id FROM public.workout_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_plan_days_update_own"
  ON public.workout_plan_days FOR UPDATE TO authenticated
  USING (
    workout_plan_id IN (
      SELECT id FROM public.workout_plans WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_plan_days_delete_own"
  ON public.workout_plan_days FOR DELETE TO authenticated
  USING (
    workout_plan_id IN (
      SELECT id FROM public.workout_plans WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. RLS: workout_plan_exercises
--    Solo si pertenecen a un day cuyo plan es del usuario.
-- ============================================================
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_plan_exercises_select_own"
  ON public.workout_plan_exercises FOR SELECT TO authenticated
  USING (
    workout_plan_day_id IN (
      SELECT d.id
        FROM public.workout_plan_days d
        JOIN public.workout_plans p ON p.id = d.workout_plan_id
       WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_plan_exercises_insert_own"
  ON public.workout_plan_exercises FOR INSERT TO authenticated
  WITH CHECK (
    workout_plan_day_id IN (
      SELECT d.id
        FROM public.workout_plan_days d
        JOIN public.workout_plans p ON p.id = d.workout_plan_id
       WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_plan_exercises_update_own"
  ON public.workout_plan_exercises FOR UPDATE TO authenticated
  USING (
    workout_plan_day_id IN (
      SELECT d.id
        FROM public.workout_plan_days d
        JOIN public.workout_plans p ON p.id = d.workout_plan_id
       WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_plan_exercises_delete_own"
  ON public.workout_plan_exercises FOR DELETE TO authenticated
  USING (
    workout_plan_day_id IN (
      SELECT d.id
        FROM public.workout_plan_days d
        JOIN public.workout_plans p ON p.id = d.workout_plan_id
       WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. Privilegios explícitos
--    REVOKE ALL + reconstrucción desde cero.
--    service_role: acceso total (necesario para RPC server-side).
--    authenticated: solo SELECT (escritura solo via RPC).
--    anon: ningún acceso.
-- ============================================================
REVOKE ALL PRIVILEGES ON TABLE public.workout_plans          FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.workout_plan_days      FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.workout_plan_exercises FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.workout_plans          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.workout_plan_days      TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.workout_plan_exercises TO service_role;

GRANT SELECT
  ON TABLE public.workout_plans          TO authenticated;
GRANT SELECT
  ON TABLE public.workout_plan_days      TO authenticated;
GRANT SELECT
  ON TABLE public.workout_plan_exercises TO authenticated;

-- ============================================================
-- 8. RPC: create_workout_plan
--    Crea el plan, sus días y ejercicios en una sola transacción.
--    SECURITY DEFINER + search_path explícito.
--    Solo callable por service_role (servidor).
--
--    Parámetros:
--      p_user_id       — UUID del usuario propietario
--      p_name          — Nombre del plan
--      p_goal          — Objetivo (ganar_masa_muscular, etc.)
--      p_experience    — Nivel (principiante, intermedio, avanzado)
--      p_days_per_week — Días de entrenamiento por semana
--      p_source        — Origen: 'template' | 'manual' | 'ai'
--      p_days          — JSONB array de días con ejercicios:
--        [{
--          day_number:   integer,
--          name:         text,
--          description:  text | null,
--          sort_order:   integer,
--          exercises: [{
--            exercise_id:      uuid,
--            sort_order:       integer,
--            sets:             integer,
--            reps_min:         integer | null,
--            reps_max:         integer | null,
--            duration_seconds: integer | null,
--            rest_seconds:     integer,
--            rir:              integer | null,
--            notes:            text | null
--          }]
--        }]
--
--    Retorna: uuid del nuevo workout_plan.
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_workout_plan(
  p_user_id       uuid,
  p_name          text,
  p_goal          text,
  p_experience    text,
  p_days_per_week integer,
  p_source        text,
  p_days          jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_version integer;
  v_day     jsonb;
  v_ex      jsonb;
  v_day_id  uuid;
BEGIN
  -- 1. Calcular próxima versión para este usuario
  SELECT COALESCE(MAX(version), 0) + 1
    INTO v_version
    FROM public.workout_plans
   WHERE user_id = p_user_id;

  -- 2. Archivar plan activo anterior (si existe)
  UPDATE public.workout_plans
     SET status    = 'archived',
         is_active = false,
         updated_at = now()
   WHERE user_id  = p_user_id
     AND is_active = true;

  -- 3. Crear el nuevo plan
  INSERT INTO public.workout_plans
    (user_id, name, goal, experience, days_per_week, source, status, version, is_active)
  VALUES
    (p_user_id, p_name, p_goal, p_experience, p_days_per_week, p_source, 'active', v_version, true)
  RETURNING id INTO v_plan_id;

  -- 4. Crear días y ejercicios
  FOR v_day IN SELECT value FROM jsonb_array_elements(p_days) LOOP
    INSERT INTO public.workout_plan_days
      (workout_plan_id, day_number, name, description, sort_order)
    VALUES (
      v_plan_id,
      (v_day->>'day_number')::integer,
      v_day->>'name',
      NULLIF(v_day->>'description', ''),
      (v_day->>'sort_order')::integer
    )
    RETURNING id INTO v_day_id;

    FOR v_ex IN SELECT value FROM jsonb_array_elements(v_day->'exercises') LOOP
      INSERT INTO public.workout_plan_exercises (
        workout_plan_day_id,
        exercise_id,
        sort_order,
        sets,
        reps_min,
        reps_max,
        duration_seconds,
        rest_seconds,
        rir,
        notes
      ) VALUES (
        v_day_id,
        (v_ex->>'exercise_id')::uuid,
        (v_ex->>'sort_order')::integer,
        (v_ex->>'sets')::integer,
        CASE WHEN jsonb_typeof(v_ex->'reps_min')         = 'number' THEN (v_ex->>'reps_min')::integer         END,
        CASE WHEN jsonb_typeof(v_ex->'reps_max')         = 'number' THEN (v_ex->>'reps_max')::integer         END,
        CASE WHEN jsonb_typeof(v_ex->'duration_seconds') = 'number' THEN (v_ex->>'duration_seconds')::integer END,
        COALESCE(
          CASE WHEN jsonb_typeof(v_ex->'rest_seconds') = 'number' THEN (v_ex->>'rest_seconds')::integer END,
          60
        ),
        CASE WHEN jsonb_typeof(v_ex->'rir')   = 'number' THEN (v_ex->>'rir')::integer   END,
        NULLIF(v_ex->>'notes', '')
      );
    END LOOP;
  END LOOP;

  RETURN v_plan_id;
END;
$$;

-- Solo service_role puede ejecutar este RPC (llamado desde servidor)
REVOKE ALL ON FUNCTION public.create_workout_plan(
  uuid, text, text, text, integer, text, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_workout_plan(
  uuid, text, text, text, integer, text, jsonb
) TO service_role;
