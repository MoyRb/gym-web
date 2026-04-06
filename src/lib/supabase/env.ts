function getEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const supabaseUrl = () => getEnv("NEXT_PUBLIC_SUPABASE_URL")
export const supabaseAnonKey = () => getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
export const supabaseServiceRoleKey = () => getEnv("SUPABASE_SERVICE_ROLE_KEY")

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS
  if (!raw) return []
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}
