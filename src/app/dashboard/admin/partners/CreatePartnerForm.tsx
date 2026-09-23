"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"

interface FormState {
  name: string
  code: string
  monthly_commission_bps: number
  long_term_commission_bps: number
}

export function CreatePartnerForm() {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "",
    code: "",
    monthly_commission_bps: 5000,
    long_term_commission_bps: 1500,
  })

  function reset() {
    setForm({ name: "", code: "", monthly_commission_bps: 5000, long_term_commission_bps: 1500 })
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: form.code.toUpperCase(),
        }),
      })

      const data = (await res.json()) as { error?: string; fields?: Record<string, string[]> }

      if (!res.ok) {
        setError(data.error ?? "Error al crear partner.")
        return
      }

      // Reload page to show new partner
      window.location.reload()
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Nuevo partner
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold">Nuevo gym partner</h3>
          <button onClick={() => { setOpen(false); reset() }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-name">Nombre del gimnasio</Label>
            <Input
              id="partner-name"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Power Fitness Zamora"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partner-code">Código único (URL pública)</Label>
            <Input
              id="partner-code"
              value={form.code}
              onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
              placeholder="POWERFITZAMORA"
              className="font-mono"
              required
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Solo letras mayúsculas y números. Se usará en la URL: /r/{form.code || "CÓDIGO"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthly-bps">Comisión mensual (bps)</Label>
              <Input
                id="monthly-bps"
                type="number"
                min={0}
                max={10000}
                value={form.monthly_commission_bps}
                onChange={(e) => setForm(f => ({ ...f, monthly_commission_bps: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-muted-foreground">
                {form.monthly_commission_bps} bps = {(form.monthly_commission_bps / 100).toFixed(0)}% ($
                {((9900 * form.monthly_commission_bps) / 10000 / 100).toFixed(2)} MXN)
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lt-bps">Comisión largo plazo (bps)</Label>
              <Input
                id="lt-bps"
                type="number"
                min={0}
                max={10000}
                value={form.long_term_commission_bps}
                onChange={(e) => setForm(f => ({ ...f, long_term_commission_bps: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-muted-foreground">
                {form.long_term_commission_bps} bps = {(form.long_term_commission_bps / 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => { setOpen(false); reset() }}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando..." : "Crear partner"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
