-- =============================================================================
-- CORTE 2B — Parte 2: Extensión de public.exercise_media
-- Branch: feat/exercise-catalog
-- Date: 2026-08-12
--
-- El bucket exercise-media se configura en supabase/config.toml.
-- Esta migración solo modifica public.exercise_media.
-- =============================================================================

-- ============================================================
-- 1. Extender public.exercise_media
--    Nuevas columnas: content_sha256, source, source_id
-- ============================================================
ALTER TABLE public.exercise_media
  ADD COLUMN content_sha256 text,
  ADD COLUMN source         text,
  ADD COLUMN source_id      text;

-- ============================================================
-- 2. Constraint UNIQUE normal (no parcial)
--    Permite onConflict: 'source,source_id,kind' en el importer.
--    Garantiza idempotencia: misma fuente + mismo ejercicio +
--    mismo kind solo puede tener una fila.
-- ============================================================
ALTER TABLE public.exercise_media
  ADD CONSTRAINT exercise_media_source_unique
    UNIQUE (source, source_id, kind);
