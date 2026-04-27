import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env-public"

let browserClient: SupabaseClient<Database> | undefined

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey())
  }

  return browserClient
}
