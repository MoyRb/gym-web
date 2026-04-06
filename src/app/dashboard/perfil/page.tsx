"use client"

import { useState, useEffect } from "react"
import { User, Save, RotateCcw, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ImcCard } from "@/components/dashboard/ImcCard"
import { useProfile } from "@/hooks/useProfile"
import { analytics } from "@/utils/analytics"
import type { UserProfile, Objetivo, Experiencia, Sexo } from "@/types"

const objetivos: { value: Objetivo; label: string }[] = [
  { value: "ganar_masa_muscular", label: "Ganar masa muscular" },
  { value: "bajar_grasa", label: "Bajar grasa" },
  { value: "mejorar_resistencia", label: "Mejorar resistencia" },
  { value: "mejorar_condicion_general", label: "Mejorar condición general" },
]

const experiencias: { value: Experiencia; label: string }[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
]

const sexos: { value: Sexo; label: string }[] = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro / Prefiero no decir" },
]

const diasOptions = [2, 3, 4, 5, 6]

export default function PerfilPage() {
  const { profile, saveProfile, isLoading } = useProfile()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<UserProfile>({
    nombre: "",
    edad: 25,
    sexo: "masculino",
    peso_kg: 70,
    altura_cm: 170,
    experiencia: "principiante",
    objetivo: "ganar_masa_muscular",
    dias_por_semana: 3,
  })

  useEffect(() => {
    if (profile) setForm(profile)
  }, [profile])

  function set<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await saveProfile(form)
    analytics.perfilCompletado(form.objetivo, form.experiencia)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Mi perfil</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Completa tus datos para recibir rutinas y recomendaciones personalizadas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {/* Personal data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos personales</CardTitle>
                  <CardDescription>Información básica de identificación</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="nombre">Nombre completo</Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Tu nombre"
                      value={form.nombre}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("nombre", e.target.value)}
                      className="h-10"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="edad">Edad (años)</Label>
                    <Input
                      id="edad"
                      type="number"
                      min={14}
                      max={100}
                      value={form.edad}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("edad", Number(e.target.value))}
                      className="h-10"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Sexo</Label>
                    <div className="flex flex-wrap gap-2">
                      {sexos.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => set("sexo", s.value)}
                          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                            form.sexo === s.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Physical data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos físicos</CardTitle>
                  <CardDescription>Se usarán para calcular tu IMC y adaptar la rutina</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="peso">Peso (kg)</Label>
                    <Input
                      id="peso"
                      type="number"
                      min={30}
                      max={300}
                      step={0.1}
                      value={form.peso_kg}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("peso_kg", Number(e.target.value))}
                      className="h-10"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="altura">Altura (cm)</Label>
                    <Input
                      id="altura"
                      type="number"
                      min={100}
                      max={250}
                      value={form.altura_cm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("altura_cm", Number(e.target.value))}
                      className="h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Training preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preferencias de entrenamiento</CardTitle>
                  <CardDescription>Determinarán la rutina que te recomendamos</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <Label>Objetivo principal</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {objetivos.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => set("objetivo", o.value)}
                          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium text-left transition-colors ${
                            form.objetivo === o.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          <div className={`h-2 w-2 rounded-full shrink-0 ${form.objetivo === o.value ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Nivel de experiencia</Label>
                    <div className="flex flex-wrap gap-2">
                      {experiencias.map((exp) => (
                        <button
                          key={exp.value}
                          type="button"
                          onClick={() => set("experiencia", exp.value)}
                          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                            form.experiencia === exp.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Días disponibles por semana</Label>
                    <div className="flex flex-wrap gap-2">
                      {diasOptions.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => set("dias_por_semana", d)}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
                            form.dias_por_semana === d
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{form.dias_por_semana} días por semana seleccionados</p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button type="submit" className="gap-2" disabled={isLoading}>
                  {saved ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      ¡Guardado!
                    </>
                  ) : isLoading ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Guardar perfil
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => profile && setForm(profile)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Descartar cambios
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* IMC preview */}
        <div className="flex flex-col gap-4">
          <div className="sticky top-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Vista previa IMC
            </h3>
            <ImcCard peso_kg={form.peso_kg} altura_cm={form.altura_cm} />

            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
              <h4 className="text-sm font-semibold mb-3">Resumen del perfil</h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Nombre", value: form.nombre || "—" },
                  { label: "Edad", value: form.edad ? `${form.edad} años` : "—" },
                  { label: "Peso", value: `${form.peso_kg} kg` },
                  { label: "Altura", value: `${form.altura_cm} cm` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs capitalize">{form.experiencia}</Badge>
                <Badge variant="outline" className="text-xs">{form.dias_por_semana} días/sem</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
