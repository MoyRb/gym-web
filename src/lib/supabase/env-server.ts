import "server-only"

export function supabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY")
  }
  return value
}

/**
 * BOOTSTRAP ONLY — not an authorization mechanism.
 *
 * Use this function exclusively in one-off CLI scripts to seed the first admin
 * entry in `public.user_roles` when setting up a new environment.
 * Authorization is handled exclusively by `public.is_current_user_admin()` via
 * `requireAdmin()` in `src/lib/auth/guards.ts`.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS
  if (!raw) return []
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}
