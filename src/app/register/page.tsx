"use client"

import Link from "next/link"
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { analytics } from "@/utils/analytics"
import { createClient } from "@/lib/supabase/client"
import { normalizeUsername, usernameToInternalEmail, validateUsername } from "@/lib/auth/username"

const benefits = [
  "Rutina personalizada generada con IA",
  "Guía visual por ejercicio",
  "Seguimiento de progreso y métricas",
]

export default function RegisterPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ nombre: "", username: "", password: "" })
  const [errors, setErrors] = useState<{ nombre?: string; username?: string; password?: string; form?: string }>({})

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validate() {
    const errs: typeof errors = {}
    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio"
    const usernameError = validateUsername(form.username)
    if (usernameError) errs.username = usernameError
    if (!form.password) errs.password = "La contraseña es obligatoria"
    else if (form.password.length < 6) errs.password = "Mínimo 6 caracteres"
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

    const username = normalizeUsername(form.username)
    const internalEmail = usernameToInternalEmail(username)

    const registerResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        username,
        password: form.password,
      }),
    })

    if (!registerResponse.ok) {
      const body = (await registerResponse.json().catch(() => null)) as { error?: string } | null
      setErrors({ form: body?.error ?? "No fue posible completar el registro con esos datos." })
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password: form.password,
    })

    if (signInError) {
      setErrors({ form: "Cuenta creada. Inicia sesión para continuar." })
      setIsLoading(false)
      return
    }

    await analytics.register("username")
    router.replace("/dashboard/perfil")
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
      <main className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo + heading */}
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <AlphaTrainerLogo variant="accent" height={36} />
            </div>
            <h1 className="text-2xl font-bold">Crea tu cuenta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gratis. Sin tarjeta de crédito.
            </p>
          </div>

          {/* Benefits */}
          <ul className="mb-6 flex flex-col gap-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                {b}
              </li>
            ))}
          </ul>

          {/* Form */}
          <div className="rounded-lg border border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Tu nombre"
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  aria-invalid={!!errors.nombre}
                  className="h-10 text-base sm:text-sm"
                  autoComplete="name"
                />
                {errors.nombre && (
                  <p className="text-xs text-destructive">{errors.nombre}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ej: juan.perez"
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
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
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    aria-invalid={!!errors.password}
                    className="h-10 pr-10 text-base sm:text-sm"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar" : "Mostrar"}
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
                {isLoading ? "Creando cuenta..." : "Crear cuenta gratis"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
