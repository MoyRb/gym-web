import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSafeRedirectPath } from "@/lib/auth/app-url"
import type { EmailOtpType } from "@supabase/supabase-js"

const ALLOWED_OTP_TYPES: EmailOtpType[] = [
  "email",
  "recovery",
  "email_change",
  "invite",
  "magiclink",
]

function isValidOtpType(t: string): t is EmailOtpType {
  return ALLOWED_OTP_TYPES.includes(t as EmailOtpType)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next")

  if (!token_hash || !type || !isValidOtpType(type)) {
    return NextResponse.redirect(new URL("/auth/confirm-error", origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    return NextResponse.redirect(new URL("/auth/confirm-error", origin))
  }

  // Password recovery: keep the temporary session alive so /reset-password
  // can call supabase.auth.updateUser({ password }). Do NOT sign out here.
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", origin))
  }

  // Email signup confirmation: sign out the temporary session created by
  // verifyOtp so the user must log in explicitly with their credentials.
  if (type === "email") {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL("/auth/confirmed", origin))
  }

  // Other types (email_change, invite, magiclink): preserve session, redirect to
  // dashboard or the requested next path. These are not currently used in production.
  const redirectPath =
    next && isSafeRedirectPath(next) ? next : "/dashboard/perfil"

  return NextResponse.redirect(new URL(redirectPath, origin))
}
