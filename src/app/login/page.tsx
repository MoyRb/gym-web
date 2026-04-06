"use client"

import Link from "next/link"
import { Dumbbell, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { analytics } from "@/utils/analytics"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  function validate() {
    const errs: typeof errors = {}
    if (!email) errs.email = "El email es obligatorio"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email inválido"
    if (!password) errs.password = "La contraseña es obligatoria"
    else if (password.length < 6) errs.password = "Mínimo 6 caracteres"
    return errs
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setIsLoading(true)
    // TODO: await supabase.auth.signInWithPassword({ email, password })
    analytics.login()
    await new Promise((r) => setTimeout(r, 1000)) // mock delay
    setIsLoading(false)
    window.location.href = "/dashboard"
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
      <div className="absolute -top-40 -right-40 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      {/* Header */}
      <header className="flex h-16 items-center border-b border-border/40 bg-background/95 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Dumbbell className="h-4 w-4 text-primary-foreground" />
          </div>
          <span>
            <span className="text-primary">TITAN</span>
            <span className="text-foreground">FIT</span>
          </span>
        </Link>
        <Link href="/" className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Bienvenido de vuelta</h1>
            <p className="mt-2 text-muted-foreground">Inicia sesión para continuar con tu entrenamiento</p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Iniciar sesión</CardTitle>
              <CardDescription>Introduce tus credenciales para acceder</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    className="h-10"
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <Link href="#" className="text-xs text-primary hover:underline">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      aria-invalid={!!errors.password}
                      className="h-10 pr-10"
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
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" className="h-10 mt-2" disabled={isLoading}>
                  {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Crear cuenta gratis
                </Link>
              </p>
            </CardFooter>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Al continuar, aceptas nuestros{" "}
            <Link href="#" className="underline hover:text-foreground">Términos de servicio</Link>
            {" "}y{" "}
            <Link href="#" className="underline hover:text-foreground">Política de privacidad</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
