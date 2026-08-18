-- =============================================================================
-- CORTE 3B — Activar GIFs GymVisual con licencia comercial
-- Date: 2026-08-18
--
-- Activa EXCLUSIVAMENTE los GIFs de la fuente GymVisual / hasaneyldrm,
-- que pasaron de license_status='pending' a 'licensed' tras obtener
-- licencia comercial válida.
--
-- Criterio de identificación inequívoco (doble filtro):
--   1. source = 'hasaneyldrm/exercises-dataset'
--      → columna `source` en exercise_media, cargada por el importer.
--   2. storage_path LIKE 'third-party/gymvisual/%'
--      → ruta canónica de los GIFs importados (buildStoragePath).
--   3. kind = 'gif'
--      → solo el tipo de media relevante; no afecta imágenes/video si los hubiera.
--
-- Idempotente: el WHERE filtra solo filas aún en estado pendiente/inactivo.
-- Ejecutar varias veces no produce efectos adicionales.
--
-- Filas esperadas a afectar: ~1 324 (un GIF por ejercicio del dataset).
--
-- NO aplicar remotamente sin aprobación del equipo.
-- =============================================================================

UPDATE public.exercise_media
SET
  license_status = 'licensed',
  is_active      = true
WHERE source       = 'hasaneyldrm/exercises-dataset'
  AND storage_path LIKE 'third-party/gymvisual/%'
  AND kind         = 'gif'
  AND license_status = 'pending'
  AND is_active      = false;
