"use client"

import Link from "next/link"
import { Mail, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { createClient } from "@/lib/supabase/client"

const RESEND_COOLDOWN_SECONDS = 60

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  const visible = local[0] ?? ""
  return `${visible}***@${domain}`
}

export default function VerifyEmailPage() {
  const [pendingEmail] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return sessionStorage.getItem("alpha-trainer.pending-email")
  })
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function handleResend() {
    if (!pendingEmail || cooldown > 0 || isResending) return

    setIsResending(true)
    setResendMessage(null)

    const supabase = createClient()
    await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    // Neutral: don't reveal if the email is registered or not.
    setResendMessage("Si la dirección es válida, enviamos un nuevo correo.")
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setIsResending(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <BrandBackground variant="auth" />

      <header className="relative flex h-16 items-center px-4 sm:px-8 border-b border-border">
        <AlphaTrainerLogo href="/" variant="auto" height={26} />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <AlphaTrainerLogo variant="accent" height={36} />
          </div>

          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="mb-2 text-2xl font-bold">Verifica tu correo</h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace para confirmar tu cuenta.
          </p>

          {pendingEmail && (
            <p className="mt-3 text-sm font-medium text-foreground">
              {maskEmail(pendingEmail)}
            </p>
          )}

          <div className="mt-8 rounded-lg border border-border bg-card p-6 text-left">
            <p className="mb-5 text-sm text-muted-foreground">
              Abre el correo que te enviamos y haz clic en el botón de verificación.
              Puede tardar unos minutos en llegar.
            </p>

            <p className="mb-5 text-xs text-muted-foreground">
              ¿No lo encuentras? Revisa spam o correo no deseado.
            </p>

            {resendMessage && (
              <p className="mb-4 rounded border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {resendMessage}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending || !pendingEmail}
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
              {cooldown > 0
                ? `Reenviar en ${cooldown} s`
                : isResending
                  ? "Enviando..."
                  : "Reenviar correo"}
            </Button>
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
