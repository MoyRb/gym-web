import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env"

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey())
}
