"use client"

import Link from "next/link"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { analytics } from "@/utils/analytics"
import { createClient } from "@/lib/supabase/client"
import { normalizeUsername, usernameToInternalEmail } from "@/lib/auth/username"
import { isSafeRedirectPath } from "@/lib/auth/app-url"

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function LoginPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLegacyMode, setIsLegacyMode] = useState(false)

  // Primary (email) mode state
  const [email, setEmail] = useState("")
  // Legacy mode state
  const [legacyUsername, setLegacyUsername] = useState("")

  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{
    identifier?: string
    password?: string
    form?: string
  }>({})
  const [showResendVerification, setShowResendVerification] = useState(false)

  function validate(): typeof errors {
    const errs: typeof errors = {}

    if (isLegacyMode) {
      if (!legacyUsername.trim()) errs.identifier = "El nombre de usuario es obligatorio"
    } else {
      const trimmed = email.toLowerCase().trim()
      if (!trimmed) errs.identifier = "El correo electrónico es obligatorio"
      else if (!isValidEmail(trimmed)) errs.identifier = "Introduce un correo válido"
    }

    if (!password) errs.password = "La contraseña es obligatoria"

    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setShowResendVerification(false)
    setIsLoading(true)

    const supabase = createClient()
    const loginEmail = isLegacyMode
      ? usernameToInternalEmail(normalizeUsername(legacyUsername))
      : email.toLowerCase().trim()

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (error) {
      const isUnconfirmed =
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("email_not_confirmed")

      if (isUnconfirmed && !isLegacyMode) {
        setErrors({
          form: "Necesitas verificar tu correo antes de iniciar sesión.",
        })
        setShowResendVerification(true)
        setIsLoading(false)
        return
      }

      setErrors({ form: "No pudimos iniciar sesión. Revisa tus datos." })
      setIsLoading(false)
      return
    }

    await analytics.loginCompleted(isLegacyMode ? "legacy_username" : "email")

    const rawNext = new URL(window.location.href).searchParams.get("next") ?? ""
    const nextPath = isSafeRedirectPath(rawNext) ? rawNext : "/dashboard"
    router.replace(nextPath)
    router.refresh()
  }

  async function handleResendVerification() {
    const targetEmail = email.toLowerCase().trim()
    if (!targetEmail) return

    const supabase = createClient()
    await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    })

    sessionStorage.setItem("alpha-trainer.pending-email", targetEmail)
    router.push("/verify-email")
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <BrandBackground variant="auth" />

      {/* Header */}
      <header className="relative flex h-16 items-center justify-between border-b border-border px-4 sm:px-8">
        <AlphaTrainerLogo href="/" variant="auto" height={26} />
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </header>

      {/* Main */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {/* Logo + heading */}
          <div className="mb-10 text-center">
            <div className="mb-6 flex justify-center">
              <AlphaTrainerLogo variant="accent" height={36} />
            </div>
            <h1 className="text-2xl font-bold">Accede a tu cuenta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isLegacyMode
                ? "Accediendo con cuenta anterior."
                : "Ingresa con tu correo y contraseña."}
            </p>
          </div>

          {/* Form */}
          <div className="rounded-lg border border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              {/* Email or Username */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="identifier">
                  {isLegacyMode ? "Nombre de usuario" : "Correo electrónico"}
                </Label>
                {isLegacyMode ? (
                  <Input
                    id="identifier"
                    key="legacy-username"
                    type="text"
                    placeholder="ej: juan.perez"
                    value={legacyUsername}
                    onChange={(e) => setLegacyUsername(e.target.value)}
                    aria-invalid={!!errors.identifier}
                    aria-describedby={errors.identifier ? "identifier-error" : undefined}
                    className="h-10 text-base sm:text-sm"
                    autoComplete="username"
                    autoCapitalize="none"
                  />
                ) : (
                  <Input
                    id="identifier"
                    key="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.identifier}
                    aria-describedby={errors.identifier ? "identifier-error" : undefined}
                    className="h-10 text-base sm:text-sm"
                    autoComplete="email"
                    autoCapitalize="none"
                  />
                )}
                {errors.identifier && (
                  <p id="identifier-error" className="text-xs text-destructive">
                    {errors.identifier}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  {!isLegacyMode && (
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className="h-10 pr-10 text-base sm:text-sm"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {errors.form && (
                <div className="rounded border border-destructive/20 bg-destructive/10 px-3 py-2">
                  <p className="text-xs text-destructive">{errors.form}</p>
                  {showResendVerification && (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      Reenviar verificación
                    </button>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Iniciando sesión..." : "Acceder"}
              </Button>
            </form>
          </div>

          {/* Legacy toggle */}
          <div className="mt-4 text-center">
            {isLegacyMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsLegacyMode(false)
                  setErrors({})
                  setShowResendVerification(false)
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Iniciar con correo electrónico
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">
                ¿Usas una cuenta anterior?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLegacyMode(true)
                    setErrors({})
                    setShowResendVerification(false)
                  }}
                  className="font-medium text-muted-foreground hover:text-foreground underline transition-colors"
                >
                  Iniciar con nombre de usuario
                </button>
              </p>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
