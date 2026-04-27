import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env-public"

const PRIVATE_PREFIXES = ["/dashboard"]
const AUTH_ROUTES = ["/login", "/register"]
const SUPABASE_COOKIE_PREFIXES = ["sb-", "supabase-"]

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (!SUPABASE_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue
    request.cookies.delete(name)
    response.cookies.delete(name)
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  let hasInvalidRefreshToken = false

  if (userError) {
    hasInvalidRefreshToken =
      userError.message.includes("Invalid Refresh Token") ||
      userError.message.includes("Refresh Token Not Found")

    if (hasInvalidRefreshToken) {
      clearSupabaseCookies(request, response)
    } else if (process.env.NODE_ENV !== "production") {
      console.warn("[middleware] Error recuperando usuario", userError.message)
    }
  }

  const path = request.nextUrl.pathname
  const isPrivateRoute = PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.includes(path)

  if (!user && isPrivateRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", path)
    const redirectResponse = NextResponse.redirect(url)
    if (hasInvalidRefreshToken) {
      clearSupabaseCookies(request, redirectResponse)
    }
    return redirectResponse
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    const redirectResponse = NextResponse.redirect(url)
    if (hasInvalidRefreshToken) {
      clearSupabaseCookies(request, redirectResponse)
    }
    return redirectResponse
  }

  return response
}
