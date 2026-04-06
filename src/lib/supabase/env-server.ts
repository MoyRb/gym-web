import "server-only"

export function supabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY")
  }
  return value
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS
  if (!raw) return []
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}
