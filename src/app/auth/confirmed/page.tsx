"use client"

import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { buttonVariants } from "@/components/ui/button"

export default function ConfirmedPage() {
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
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </div>

          <h1 className="mb-2 text-2xl font-bold">Correo confirmado</h1>
          <p className="text-sm text-muted-foreground">
            Tu cuenta de Alpha Trainer está lista. Ya puedes iniciar sesión.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/login"
              className={buttonVariants({ className: "w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90" })}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", className: "w-full justify-center" })}
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
