"use client"

import Link from "next/link"
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GymLogo } from "@/components/layout/GymLogo"
import { analytics } from "@/utils/analytics"
import { createClient } from "@/lib/supabase/client"

const benefits = ["Rutina inicial según tu objetivo", "Cálculo de IMC en tiempo real", "Recursos PDF descargables"]

export default function RegisterPage() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ nombre: "", email: "", password: "" })
  const [errors, setErrors] = useState<{ nombre?: string; email?: string; password?: string; form?: string }>({})

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function validate() {
    const errs: typeof errors = {}
    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio"
    if (!form.email) errs.email = "El email es obligatorio"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido"
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

    const supabase = createClient()

    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.nombre,
        },
      },
    })

    if (signUpError) {
      setErrors({ form: "No fue posible completar el registro con esos datos." })
      setIsLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (signInError) {
      setErrors({ form: "Cuenta creada. Inicia sesión para continuar." })
      setIsLoading(false)
      return
    }

    await analytics.register()
    router.replace("/dashboard/perfil")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-background" />
      <div className="absolute -left-40 -top-40 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <header className="flex h-16 items-center border-b border-border/40 bg-background/95 px-4 sm:px-6">
        <GymLogo />
        <Link href="/" className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">Registro de socios</Badge>
            <h1 className="text-3xl font-bold">Crea tu cuenta para ver tus rutinas</h1>
            <p className="mt-2 text-muted-foreground">Regístrate para recibir tu rutina inicial.</p>
          </div>

          <ul className="mb-6 flex flex-col gap-2">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                {b}
              </li>
            ))}
          </ul>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Crear cuenta</CardTitle>
              <CardDescription>Rellena el formulario para comenzar</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nombre">Nombre completo</Label>
                  <Input id="nombre" type="text" placeholder="Tu nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} aria-invalid={!!errors.nombre} className="h-10" />
                  {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="tu@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} className="h-10" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => set("password", e.target.value)} aria-invalid={!!errors.password} className="h-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar" : "Mostrar"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                {errors.form && <p className="text-xs text-destructive">{errors.form}</p>}

                <Button type="submit" className="mt-2 h-10" disabled={isLoading}>
                  {isLoading ? "Creando cuenta..." : "Registrarme"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">Iniciar sesión</Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
