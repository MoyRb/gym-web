"use client"

import Link from "next/link"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BrandMark } from "@/components/layout/BrandMark"
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
    <div className="flex min-h-screen flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
      <div className="absolute -right-40 -top-40 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <header className="flex h-16 items-center border-b border-border/40 bg-background/95 px-4 sm:px-6">
        <BrandMark variant="header" className="text-lg sm:text-xl" />
        <Link href="/" className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Accede a tu cuenta</h1>
            <p className="mt-2 text-muted-foreground">Ingresa para ver tu perfil físico, tu IMC y tus rutinas.</p>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Iniciar sesión</CardTitle>
              <CardDescription>Introduce tus credenciales para continuar</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input id="username" type="text" placeholder="ej: juan.perez" value={username} onChange={(e) => setUsername(e.target.value)} aria-invalid={!!errors.username} className="h-10" />
                  {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password} className="h-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}

                <Button type="submit" className="mt-2 h-10" disabled={isLoading}>
                  {isLoading ? "Iniciando sesión..." : "Acceder"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                ¿Aún no tienes cuenta?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Crea tu cuenta
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
