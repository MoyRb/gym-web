import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { normalizeUsername, validateUsername } from "@/lib/auth/username"

interface RegisterPayload {
  nombre?: string
  username?: string
  email?: string
  password?: string
  emailRedirectTo?: string
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as RegisterPayload | null

  const nombre = payload?.nombre?.trim() ?? ""
  const usernameInput = payload?.username ?? ""
  const email = (payload?.email ?? "").toLowerCase().trim()
  const password = payload?.password ?? ""
  const emailRedirectTo = payload?.emailRedirectTo ?? ""

  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
  }

  const usernameError = validateUsername(usernameInput)
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 })
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "El correo electrónico no es válido" }, { status: 400 })
  }

  if (!password) {
    return NextResponse.json({ error: "La contraseña es obligatoria" }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  }

  const username = normalizeUsername(usernameInput)

  // Pre-check username uniqueness (service role READ — not used for account creation).
  const serviceRole = createServiceRoleClient()
  const { data: existingProfile, error: profileCheckError } = await serviceRole
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (profileCheckError) {
    return NextResponse.json({ error: "No fue posible validar el usuario" }, { status: 500 })
  }

  if (existingProfile) {
    return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 })
  }

  // Create account via standard Supabase Auth signUp (anon key, no service role).
  const supabase = await createClient()
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        full_name: nombre,
      },
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
    },
  })

  if (signUpError) {
    // Avoid leaking whether the email already exists (account enumeration).
    const isEmailConflict = /already registered|already exists|user already/i.test(signUpError.message)
    if (isEmailConflict) {
      // Neutral: reveal nothing about existing account.
      return NextResponse.json({ ok: true })
    }

    const isUsernameTaken = /duplicate key.*username|profiles_username/i.test(signUpError.message)
    if (isUsernameTaken) {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 })
    }

    return NextResponse.json({ error: "No fue posible completar el registro" }, { status: 500 })
  }

  // data.session is null when email confirmation is required — that is expected.
  void data

  return NextResponse.json({ ok: true })
}
