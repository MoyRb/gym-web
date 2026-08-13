-- =============================================================================
-- CORTE 2B: Catálogo real de ejercicios
-- Tablas: exercises + exercise_media
-- Branch: feat/exercise-catalog
-- Date: 2026-08-12
-- =============================================================================

-- ============================================================
-- 1. Tabla public.exercises
--    Catálogo global de ejercicios (solo metadatos + instrucciones).
--    Sin imágenes ni GIF — media propia va en exercise_media.
-- ============================================================
CREATE TABLE public.exercises (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  source            text        NOT NULL,
  source_id         text        NOT NULL,

  name              text        NOT NULL,
  body_part         text        NOT NULL,
  equipment         text        NOT NULL,
  target            text        NOT NULL,

  muscle_group      text,
  secondary_muscles text[]      NOT NULL DEFAULT '{}',

  instructions      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  instruction_steps jsonb       NOT NULL DEFAULT '{}'::jsonb,

  source_created_at timestamptz,

  is_active         boolean     NOT NULL DEFAULT true,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT exercises_source_unique UNIQUE (source, source_id)
);

CREATE TRIGGER set_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX exercises_is_active_idx  ON public.exercises (is_active);
CREATE INDEX exercises_body_part_idx  ON public.exercises (body_part);
CREATE INDEX exercises_equipment_idx  ON public.exercises (equipment);
CREATE INDEX exercises_target_idx     ON public.exercises (target);
CREATE INDEX exercises_source_idx     ON public.exercises (source, source_id);

-- ============================================================
-- 2. RLS: exercises
--    authenticated: SELECT solo registros activos.
--    anon: sin acceso.
--    No existen políticas INSERT / UPDATE / DELETE para authenticated.
-- ============================================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercises_select_active"
  ON public.exercises FOR SELECT TO authenticated
  USING (is_active = true);

-- ============================================================
-- 3. Privilegios explícitos: exercises
--    REVOKE ALL + reconstrucción desde cero.
-- ============================================================
REVOKE ALL PRIVILEGES ON TABLE public.exercises FROM anon, authenticated, service_role;

GRANT SELECT
  ON TABLE public.exercises TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.exercises TO service_role;

-- ============================================================
-- 4. Tabla public.exercise_media
--    Arquitectura preparada para media propia o licenciada.
--    NO se insertan filas del dataset hasaneyldrm (imágenes/GIF
--    de Gym Visual no están bajo licencia MIT).
--    kind:           image | gif | video
--    license_status: pending | licensed | owned
-- ============================================================
CREATE TABLE public.exercise_media (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id       uuid        NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,

  kind              text        NOT NULL CHECK (kind IN ('image', 'gif', 'video')),
  storage_path      text        NOT NULL,

  mime_type         text,

  width             int,
  height            int,

  attribution       text,
  license_status    text        NOT NULL CHECK (license_status IN ('pending', 'licensed', 'owned')),
  license_reference text,

  is_primary        boolean     NOT NULL DEFAULT false,
  is_active         boolean     NOT NULL DEFAULT false,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_exercise_media_updated_at
  BEFORE UPDATE ON public.exercise_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX exercise_media_exercise_id_idx ON public.exercise_media (exercise_id);

-- ============================================================
-- 5. RLS: exercise_media
--    authenticated: solo ve media activa con licencia válida.
--    Nunca media 'pending'.
--    anon: sin acceso.
-- ============================================================
ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exercise_media_select_licensed"
  ON public.exercise_media FOR SELECT TO authenticated
  USING (
    is_active = true
    AND license_status IN ('licensed', 'owned')
  );

-- ============================================================
-- 6. Privilegios explícitos: exercise_media
-- ============================================================
REVOKE ALL PRIVILEGES ON TABLE public.exercise_media FROM anon, authenticated, service_role;

GRANT SELECT
  ON TABLE public.exercise_media TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.exercise_media TO service_role;
