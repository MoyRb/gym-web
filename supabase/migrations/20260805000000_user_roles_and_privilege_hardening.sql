-- =============================================================================
-- Security hardening: user_roles table + privilege restriction on profiles
-- Branch: security/harden-roles-and-registration
-- Date: 2026-08-05
-- =============================================================================

-- ============================================================
-- 1. Tabla user_roles
--    PRIMARY KEY (user_id) — un único rol por usuario.
--    Promoción/revocación: UPDATE SET role = '...' WHERE user_id = ...
-- ============================================================
CREATE TABLE public.user_roles (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('member', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id)
);

CREATE TRIGGER set_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- Sin políticas de INSERT, UPDATE ni DELETE para authenticated.

-- ============================================================
-- 2. Privilegios de user_roles
--    Construidos explícitamente desde cero para eliminar
--    REFERENCES, TRIGGER y TRUNCATE heredados de Supabase.
-- ============================================================
REVOKE ALL PRIVILEGES ON TABLE public.user_roles FROM anon, authenticated, service_role;

GRANT SELECT
  ON TABLE public.user_roles TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.user_roles TO service_role;

-- ============================================================
-- 3. Migrar usuarios existentes
--    CASE determinista + ON CONFLICT (user_id) DO UPDATE
--    garantiza una sola fila por usuario.
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT
  id,
  CASE WHEN is_admin = true THEN 'admin' ELSE 'member' END
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE
  SET role       = EXCLUDED.role,
      updated_at = now();

-- ============================================================
-- 4. Función is_current_user_admin
--    SECURITY DEFINER + search_path vacío + referencias
--    completamente calificadas → sin riesgo de hijacking.
--    Devuelve false cuando auth.uid() es NULL.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

ALTER FUNCTION public.is_current_user_admin() OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_current_user_admin() FROM anon;
GRANT  EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- ============================================================
-- 5. Función assign_default_user_role
--    Trigger AFTER INSERT en public.profiles.
--    Asigna role = 'member' a cada perfil nuevo.
--    SECURITY DEFINER + search_path = '' + calificación total.
--    handle_new_user() no inserta en user_roles, este trigger
--    es el único mecanismo.
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.assign_default_user_role() OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.assign_default_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_default_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.assign_default_user_role() FROM authenticated;

CREATE TRIGGER assign_default_role_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_user_role();

-- ============================================================
-- 6. Privilegios de profiles
--    REVOKE ALL y reconstrucción columna a columna.
--    Excluidos: is_admin, created_at, updated_at, id (en UPDATE).
--    created_at/updated_at gestionados por DEFAULT y triggers.
-- ============================================================
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;

GRANT SELECT ON TABLE public.profiles TO authenticated;

GRANT INSERT (
  id, username, full_name, age, sex,
  weight_kg, height_cm, experience,
  goal, days_per_week, bmi, bmi_category
) ON public.profiles TO authenticated;

GRANT UPDATE (
  username, full_name, age, sex,
  weight_kg, height_cm, experience,
  goal, days_per_week, bmi, bmi_category
) ON public.profiles TO authenticated;

-- ============================================================
-- 7. Deprecar profiles.is_admin
-- ============================================================
COMMENT ON COLUMN public.profiles.is_admin IS
  'DEPRECADO 2026-08-05. Fuente de verdad: public.user_roles. '
  'No usar para autorización. '
  'Columna protegida contra escritura del rol authenticated. '
  'Mantenida solo por compatibilidad retroactiva hasta la migración de limpieza.';

-- ============================================================
-- 8. Endurecer handle_new_user — search_path vacío + revocar EXECUTE
--    La lógica funcional no cambia; las referencias ya están calificadas.
--    pg_catalog sigue disponible con search_path = '' en plpgsql.
-- ============================================================
ALTER FUNCTION public.handle_new_user()
  SET search_path = '';

REVOKE EXECUTE
  ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 9. Política profiles_update_own limpia (sin subquery a is_admin)
-- ============================================================
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
