-- =============================================================================
-- CORTE 2D: Workout Sessions + Set Logging + Progress
-- Tablas: workout_sessions, workout_session_exercises, workout_sets,
--         progress_measurements
-- RPC:    start_workout_session (transaccional, SECURITY DEFINER)
-- Date:   2026-08-15
-- =============================================================================

-- ============================================================
-- 1. workout_sessions
--    Una sesión = una vez que el usuario entrena un día.
--    Un usuario no puede tener dos sesiones in_progress para
--    el mismo workout_plan_day simultáneamente (partial index).
-- ============================================================
CREATE TABLE public.workout_sessions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_plan_id       uuid        REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  workout_plan_day_id   uuid        REFERENCES public.workout_plan_days(id) ON DELETE SET NULL,
  status                text        NOT NULL DEFAULT 'in_progress'
                                    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  duration_seconds      integer     CHECK (duration_seconds >= 0),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevenir duplicados in_progress para el mismo día (ignora NULLs)
CREATE UNIQUE INDEX workout_sessions_no_dup_in_progress_idx
  ON public.workout_sessions (user_id, workout_plan_day_id)
  WHERE status = 'in_progress' AND workout_plan_day_id IS NOT NULL;

CREATE INDEX workout_sessions_user_id_idx        ON public.workout_sessions (user_id);
CREATE INDEX workout_sessions_status_idx         ON public.workout_sessions (status);
CREATE INDEX workout_sessions_started_at_idx     ON public.workout_sessions (started_at DESC);
CREATE INDEX workout_sessions_plan_day_idx       ON public.workout_sessions (workout_plan_day_id);

-- ============================================================
-- 2. workout_session_exercises
--    Fotografía del ejercicio dentro de la sesión.
--    Aunque el plan cambie, la sesión histórica sigue siendo
--    interpretable vía exercise_id → exercises.
-- ============================================================
CREATE TABLE public.workout_session_exercises (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_id        uuid        NOT NULL
                                        REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  workout_plan_exercise_id  uuid        REFERENCES public.workout_plan_exercises(id) ON DELETE SET NULL,
  exercise_id               uuid        NOT NULL REFERENCES public.exercises(id),
  sort_order                integer     NOT NULL,
  target_sets               integer,
  target_reps_min           integer,
  target_reps_max           integer,
  target_duration_seconds   integer,
  target_rest_seconds       integer,
  notes                     text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_workout_session_exercises_updated_at
  BEFORE UPDATE ON public.workout_session_exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX workout_session_exercises_session_idx    ON public.workout_session_exercises (workout_session_id);
CREATE INDEX workout_session_exercises_exercise_idx   ON public.workout_session_exercises (exercise_id);
CREATE INDEX workout_session_exercises_sort_idx       ON public.workout_session_exercises (workout_session_id, sort_order);

-- ============================================================
-- 3. workout_sets
--    Una fila = una serie realizada.
--    set_number único dentro de cada session_exercise.
-- ============================================================
CREATE TABLE public.workout_sets (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_session_exercise_id uuid        NOT NULL
                                          REFERENCES public.workout_session_exercises(id) ON DELETE CASCADE,
  set_number                  integer     NOT NULL CHECK (set_number > 0),
  set_type                    text        NOT NULL DEFAULT 'working'
                                          CHECK (set_type IN ('warmup', 'working', 'dropset', 'failure')),
  weight_kg                   numeric     CHECK (weight_kg >= 0),
  reps                        integer     CHECK (reps > 0),
  duration_seconds            integer     CHECK (duration_seconds > 0),
  rir                         integer     CHECK (rir BETWEEN 0 AND 10),
  rpe                         numeric     CHECK (rpe BETWEEN 1 AND 10),
  completed                   boolean     NOT NULL DEFAULT false,
  completed_at                timestamptz,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT workout_sets_unique_set_per_exercise UNIQUE (workout_session_exercise_id, set_number)
);

CREATE TRIGGER set_workout_sets_updated_at
  BEFORE UPDATE ON public.workout_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX workout_sets_session_exercise_idx ON public.workout_sets (workout_session_exercise_id);
CREATE INDEX workout_sets_completed_idx        ON public.workout_sets (workout_session_exercise_id, completed);

-- ============================================================
-- 4. progress_measurements
--    Historial de mediciones corporales del usuario.
--    No sobrescribe el perfil automáticamente.
-- ============================================================
CREATE TABLE public.progress_measurements (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at      timestamptz NOT NULL DEFAULT now(),
  weight_kg        numeric     CHECK (weight_kg > 0),
  body_fat_percent numeric     CHECK (body_fat_percent BETWEEN 1 AND 80),
  waist_cm         numeric     CHECK (waist_cm > 0),
  chest_cm         numeric     CHECK (chest_cm > 0),
  arm_cm           numeric     CHECK (arm_cm > 0),
  thigh_cm         numeric     CHECK (thigh_cm > 0),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_progress_measurements_updated_at
  BEFORE UPDATE ON public.progress_measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX progress_measurements_user_id_idx      ON public.progress_measurements (user_id);
CREATE INDEX progress_measurements_measured_at_idx  ON public.progress_measurements (user_id, measured_at DESC);

-- ============================================================
-- 5. RLS: workout_sessions
--    authenticated: CRUD sobre sesiones propias.
-- ============================================================
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_sessions_select_own"
  ON public.workout_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "workout_sessions_insert_own"
  ON public.workout_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workout_sessions_update_own"
  ON public.workout_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "workout_sessions_delete_own"
  ON public.workout_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. RLS: workout_session_exercises
--    Solo si la sesión pertenece al usuario.
-- ============================================================
ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_session_exercises_select_own"
  ON public.workout_session_exercises FOR SELECT TO authenticated
  USING (
    workout_session_id IN (
      SELECT id FROM public.workout_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_session_exercises_insert_own"
  ON public.workout_session_exercises FOR INSERT TO authenticated
  WITH CHECK (
    workout_session_id IN (
      SELECT id FROM public.workout_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_session_exercises_update_own"
  ON public.workout_session_exercises FOR UPDATE TO authenticated
  USING (
    workout_session_id IN (
      SELECT id FROM public.workout_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workout_session_exercises_delete_own"
  ON public.workout_session_exercises FOR DELETE TO authenticated
  USING (
    workout_session_id IN (
      SELECT id FROM public.workout_sessions WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. RLS: workout_sets
--    Solo si el session_exercise pertenece a una sesión propia.
-- ============================================================
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workout_sets_select_own"
  ON public.workout_sets FOR SELECT TO authenticated
  USING (
    workout_session_exercise_id IN (
      SELECT wse.id
        FROM public.workout_session_exercises wse
        JOIN public.workout_sessions ws ON ws.id = wse.workout_session_id
       WHERE ws.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_sets_insert_own"
  ON public.workout_sets FOR INSERT TO authenticated
  WITH CHECK (
    workout_session_exercise_id IN (
      SELECT wse.id
        FROM public.workout_session_exercises wse
        JOIN public.workout_sessions ws ON ws.id = wse.workout_session_id
       WHERE ws.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_sets_update_own"
  ON public.workout_sets FOR UPDATE TO authenticated
  USING (
    workout_session_exercise_id IN (
      SELECT wse.id
        FROM public.workout_session_exercises wse
        JOIN public.workout_sessions ws ON ws.id = wse.workout_session_id
       WHERE ws.user_id = auth.uid()
    )
  );

CREATE POLICY "workout_sets_delete_own"
  ON public.workout_sets FOR DELETE TO authenticated
  USING (
    workout_session_exercise_id IN (
      SELECT wse.id
        FROM public.workout_session_exercises wse
        JOIN public.workout_sessions ws ON ws.id = wse.workout_session_id
       WHERE ws.user_id = auth.uid()
    )
  );

-- ============================================================
-- 8. RLS: progress_measurements
-- ============================================================
ALTER TABLE public.progress_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_measurements_select_own"
  ON public.progress_measurements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "progress_measurements_insert_own"
  ON public.progress_measurements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_measurements_update_own"
  ON public.progress_measurements FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "progress_measurements_delete_own"
  ON public.progress_measurements FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 9. Privilegios explícitos
--    service_role: acceso total (operaciones server-side).
--    authenticated: SELECT únicamente (mutaciones via API routes).
--    anon: sin acceso.
-- ============================================================
REVOKE ALL PRIVILEGES ON TABLE public.workout_sessions             FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.workout_session_exercises    FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.workout_sets                 FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.progress_measurements        FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_sessions          TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_session_exercises TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_sets              TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.progress_measurements     TO service_role;

GRANT SELECT ON TABLE public.workout_sessions          TO authenticated;
GRANT SELECT ON TABLE public.workout_session_exercises TO authenticated;
GRANT SELECT ON TABLE public.workout_sets              TO authenticated;
GRANT SELECT ON TABLE public.progress_measurements     TO authenticated;

-- ============================================================
-- 10. RPC: start_workout_session
--     Crea la sesión, copia ejercicios, genera series con prefill.
--     SECURITY DEFINER: se ejecuta como el owner de la función.
--     Solo callable por service_role (llamado desde servidor).
--
--     Parámetros:
--       p_user_id              — UUID del usuario (de la sesión autenticada)
--       p_workout_plan_day_id  — UUID del día a entrenar
--
--     Retorna: uuid de la nueva workout_session.
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_workout_session(
  p_user_id             uuid,
  p_workout_plan_day_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id      uuid;
  v_ses_ex_id       uuid;
  v_prev_ses_ex_id  uuid;
  v_plan_id         uuid;
  v_ex              RECORD;
  v_set_num         integer;
  v_prev_weight     numeric;
  v_prev_reps       integer;
  v_prev_rir        integer;
BEGIN
  -- 1. Validate ownership: the day must belong to an active plan owned by the user
  SELECT wp.id INTO v_plan_id
    FROM public.workout_plan_days wpd
    JOIN public.workout_plans wp ON wp.id = wpd.workout_plan_id
   WHERE wpd.id = p_workout_plan_day_id
     AND wp.user_id = p_user_id;

  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'workout_plan_day not found or not owned by this user'
      USING ERRCODE = 'P0002';
  END IF;

  -- 2. Create the session.
  --    The partial unique index prevents duplicate in_progress sessions.
  INSERT INTO public.workout_sessions (
    user_id, workout_plan_id, workout_plan_day_id, status, started_at
  ) VALUES (
    p_user_id, v_plan_id, p_workout_plan_day_id, 'in_progress', now()
  )
  RETURNING id INTO v_session_id;

  -- 3. Copy exercises from plan and create sets with prefill
  FOR v_ex IN
    SELECT *
      FROM public.workout_plan_exercises
     WHERE workout_plan_day_id = p_workout_plan_day_id
     ORDER BY sort_order
  LOOP
    -- 3a. Insert session exercise (snapshot)
    INSERT INTO public.workout_session_exercises (
      workout_session_id,
      workout_plan_exercise_id,
      exercise_id,
      sort_order,
      target_sets,
      target_reps_min,
      target_reps_max,
      target_duration_seconds,
      target_rest_seconds,
      notes
    ) VALUES (
      v_session_id,
      v_ex.id,
      v_ex.exercise_id,
      v_ex.sort_order,
      v_ex.sets,
      v_ex.reps_min,
      v_ex.reps_max,
      v_ex.duration_seconds,
      v_ex.rest_seconds,
      v_ex.notes
    )
    RETURNING id INTO v_ses_ex_id;

    -- 3b. Find the most recent completed session exercise for this exercise
    SELECT wse.id INTO v_prev_ses_ex_id
      FROM public.workout_session_exercises wse
      JOIN public.workout_sessions ws ON ws.id = wse.workout_session_id
     WHERE wse.exercise_id = v_ex.exercise_id
       AND ws.user_id      = p_user_id
       AND ws.status       = 'completed'
     ORDER BY ws.completed_at DESC NULLS LAST
     LIMIT 1;

    -- 3c. Create sets with prefill from previous session (deterministic, no AI)
    FOR v_set_num IN 1..v_ex.sets LOOP
      v_prev_weight := NULL;
      v_prev_reps   := NULL;
      v_prev_rir    := NULL;

      IF v_prev_ses_ex_id IS NOT NULL THEN
        SELECT weight_kg, reps, rir
          INTO v_prev_weight, v_prev_reps, v_prev_rir
          FROM public.workout_sets
         WHERE workout_session_exercise_id = v_prev_ses_ex_id
           AND set_number = v_set_num;
      END IF;

      INSERT INTO public.workout_sets (
        workout_session_exercise_id,
        set_number,
        set_type,
        weight_kg,
        reps,
        rir,
        completed
      ) VALUES (
        v_ses_ex_id,
        v_set_num,
        'working',
        v_prev_weight,
        v_prev_reps,
        v_prev_rir,
        false
      );
    END LOOP;

    v_prev_ses_ex_id := NULL;
  END LOOP;

  RETURN v_session_id;
END;
$$;

-- Solo service_role puede ejecutar este RPC (llamado desde servidor)
REVOKE ALL ON FUNCTION public.start_workout_session(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_workout_session(uuid, uuid) TO service_role;
