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
import { usernameToInternalEmail, validateUsername } from "@/lib/auth/username"

export default function LoginPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ username?: string; password?: string; form?: string }>({})

  function validate() {
    const errs: typeof errors = {}
    const usernameError = validateUsername(username)
    if (usernameError) errs.username = usernameError
    if (!password) errs.password = "La contraseña es obligatoria"
    else if (password.length < 6) errs.password = "Mínimo 6 caracteres"
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
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToInternalEmail(username),
      password,
    })

    if (error) {
      setErrors({ form: "No pudimos iniciar sesión. Verifica tus credenciales." })
      setIsLoading(false)
      return
    }

    await analytics.login("username")
    const nextPath = new URL(window.location.href).searchParams.get("next") || "/dashboard"
    router.replace(nextPath)
    router.refresh()
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
              Ingresa con tu nombre de usuario y contraseña.
            </p>
          </div>

          {/* Form */}
          <div className="rounded-lg border border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ej: juan.perez"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={!!errors.username}
                  className="h-10 text-base sm:text-sm"
                  autoComplete="username"
                  autoCapitalize="none"
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
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
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {errors.form && (
                <p className="rounded border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errors.form}
                </p>
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
