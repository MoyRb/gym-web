"use client"

import Link from "next/link"
import { Eye, EyeOff, CheckCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { createClient } from "@/lib/supabase/client"
import { analytics } from "@/utils/analytics"

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<{
    password?: string
    confirmPassword?: string
    form?: string
  }>({})

  function validate() {
    const errs: typeof errors = {}
    if (!password) errs.password = "La contraseña es obligatoria"
    else if (password.length < 8) errs.password = "Mínimo 8 caracteres"
    if (!confirmPassword) errs.confirmPassword = "Confirma tu contraseña"
    else if (password && password !== confirmPassword) {
      errs.confirmPassword = "Las contraseñas no coinciden"
    }
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
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrors({ form: "No pudimos actualizar tu contraseña. El enlace puede haber expirado." })
      setIsLoading(false)
      return
    }

    void analytics.passwordResetCompleted()
    // Sign out the temporary recovery session — user must log in with new credentials.
    await supabase.auth.signOut()
    setSuccess(true)
    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <BrandBackground variant="auth" />

      <header className="relative flex h-16 items-center px-4 sm:px-8 border-b border-border">
        <AlphaTrainerLogo href="/" variant="auto" height={26} />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <AlphaTrainerLogo variant="accent" height={36} />
            </div>
            <h1 className="text-2xl font-bold">Nueva contraseña</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Crea una contraseña segura para tu cuenta.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            {success ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Contraseña actualizada</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ya puedes entrar con tu nueva contraseña.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Iniciar sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                {/* New password */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className="h-10 pr-10 text-base sm:text-sm"
                      autoComplete="new-password"
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

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      aria-invalid={!!errors.confirmPassword}
                      aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
                      className="h-10 pr-10 text-base sm:text-sm"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p id="confirm-error" className="text-xs text-destructive">
                      {errors.confirmPassword}
                    </p>
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
                  {isLoading ? "Guardando..." : "Guardar contraseña"}
                </Button>
              </form>
            )}
          </div>

          {!success && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
