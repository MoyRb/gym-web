"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { createClient } from "@/lib/supabase/client"
import { analytics } from "@/utils/analytics"

const RESEND_COOLDOWN_SECONDS = 60

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.toLowerCase().trim()

    if (!trimmed) {
      setEmailError("El correo electrónico es obligatorio")
      return
    }
    if (!isValidEmail(trimmed)) {
      setEmailError("Introduce un correo válido")
      return
    }

    setEmailError(null)
    setIsLoading(true)

    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    })

    // Always neutral — avoid account enumeration.
    void analytics.passwordRecoveryRequested()
    setSubmitted(true)
    startCooldown()
    setIsLoading(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <BrandBackground variant="auth" />

      <header className="relative flex h-16 items-center justify-between border-b border-border px-4 sm:px-8">
        <AlphaTrainerLogo href="/" variant="auto" height={26} />
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <AlphaTrainerLogo variant="accent" height={36} />
            </div>
            <h1 className="text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Introduce tu correo y te enviaremos un enlace de recuperación.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            {submitted ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu
                  contraseña.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={cooldown > 0 || isLoading}
                  onClick={() => {
                    setSubmitted(false)
                    setIsLoading(false)
                  }}
                >
                  {cooldown > 0 ? `Reenviar en ${cooldown} s` : "Enviar de nuevo"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "email-error" : undefined}
                    className="h-10 text-base sm:text-sm"
                    autoComplete="email"
                    autoCapitalize="none"
                  />
                  {emailError && (
                    <p id="email-error" className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Enviando..." : "Enviar enlace de recuperación"}
                </Button>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
