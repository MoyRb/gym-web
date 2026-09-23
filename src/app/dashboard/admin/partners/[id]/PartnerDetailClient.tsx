"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, Pencil } from "lucide-react"

interface Partner {
  id: string
  name: string
  code: string
  status: string
  monthly_commission_bps: number
  long_term_commission_bps: number
}

interface Props {
  partner: Partner
  referralUrl: string
}

export function PartnerDetailClient({ partner, referralUrl }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    name: partner.name,
    code: partner.code,
    status: partner.status as "active" | "inactive",
    monthly_commission_bps: partner.monthly_commission_bps,
    long_term_commission_bps: partner.long_term_commission_bps,
  })

  async function handleCopy() {
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: form.code.toUpperCase(),
        }),
      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) {
        setError(data.error ?? "Error al guardar.")
        return
      }

      window.location.reload()
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold">{partner.name}</h2>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{partner.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            partner.status === "active"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}>
            {partner.status === "active" ? "Activo" : "Inactivo"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(!editing)}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>

      {/* Referral URL + copy button */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs text-muted-foreground">URL de referido</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-mono truncate">
            {referralUrl}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1.5 shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-primary" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar enlace
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          El QR del gimnasio debe apuntar a esta URL. El código se registra en una cookie segura (30 días).
        </p>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSave} className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-code">Código</Label>
              <Input
                id="edit-code"
                value={form.code}
                onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                className="font-mono"
                required
                maxLength={20}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-status">Estado</Label>
              <select
                id="edit-status"
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value as "active" | "inactive" }))}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-monthly-bps">Mensual (bps)</Label>
              <Input
                id="edit-monthly-bps"
                type="number"
                min={0}
                max={10000}
                value={form.monthly_commission_bps}
                onChange={(e) => setForm(f => ({ ...f, monthly_commission_bps: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-muted-foreground">
                {(form.monthly_commission_bps / 100).toFixed(0)}% del primer mes
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-lt-bps">Largo plazo (bps)</Label>
              <Input
                id="edit-lt-bps"
                type="number"
                min={0}
                max={10000}
                value={form.long_term_commission_bps}
                onChange={(e) => setForm(f => ({ ...f, long_term_commission_bps: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-[10px] text-muted-foreground">
                {(form.long_term_commission_bps / 100).toFixed(0)}% del primer 6m/año
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setError(null) }}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
