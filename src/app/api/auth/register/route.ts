import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { normalizeUsername, usernameToInternalEmail, validateUsername } from "@/lib/auth/username"

interface RegisterPayload {
  nombre?: string
  username?: string
  password?: string
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as RegisterPayload | null

  const nombre = payload?.nombre?.trim() ?? ""
  const usernameInput = payload?.username ?? ""
  const password = payload?.password ?? ""

  if (!nombre) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
  }

  const usernameError = validateUsername(usernameInput)
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 })
  }

  if (!password) {
    return NextResponse.json({ error: "La contraseña es obligatoria" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
  }

  const username = normalizeUsername(usernameInput)
  const internalEmail = usernameToInternalEmail(username)
  const supabase = createServiceRoleClient()

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle()

  if (existingProfileError) {
    return NextResponse.json({ error: "No fue posible validar el usuario" }, { status: 500 })
  }

  if (existingProfile) {
    return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 })
  }

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: nombre,
      username,
    },
  })

  if (createUserError) {
    const duplicate = /already|exists|registered/i.test(createUserError.message)
    const status = duplicate ? 409 : 500
    const message = duplicate
      ? "Ese nombre de usuario ya está en uso"
      : "No fue posible completar el registro"

    return NextResponse.json({ error: message }, { status })
  }

  const userId = createdUser.user?.id
  if (!userId) {
    return NextResponse.json({ error: "No fue posible completar el registro" }, { status: 500 })
  }

  const { error: upsertProfileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, full_name: nombre, username }, { onConflict: "id" })

  if (upsertProfileError) {
    return NextResponse.json({ error: "El usuario fue creado, pero no su perfil" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
