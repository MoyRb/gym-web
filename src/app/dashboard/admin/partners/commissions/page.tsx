import { requireAdmin } from "@/lib/auth/guards"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { CommissionStatusActions } from "./CommissionStatusActions"

export const metadata = {
  title: "Commissions — Admin",
  robots: { index: false, follow: false },
}

export default async function AdminCommissionsPage() {
  await requireAdmin()

  const service = createServiceRoleClient()

  // Fetch commissions with partner name
  const { data: commissions } = await service
    .from("referral_commissions")
    .select(`
      id,
      billing_period,
      commission_bps,
      commission_basis_amount_cents,
      commission_amount_cents,
      currency,
      status,
      created_at,
      approved_at,
      paid_at,
      voided_at,
      gym_partner_id,
      gym_partners (name, code)
    `)
    .order("created_at", { ascending: false })
    .limit(200)

  type CommissionRow = {
    id: string
    billing_period: string
    commission_bps: number
    commission_basis_amount_cents: number
    commission_amount_cents: number
    currency: string
    status: string
    created_at: string
    approved_at: string | null
    paid_at: string | null
    voided_at: string | null
    gym_partner_id: string
    gym_partners: { name: string; code: string } | null
  }

  const rows = (commissions as unknown as CommissionRow[]) ?? []

  // Summary totals
  const totals = { pending: 0, approved: 0, paid: 0, void: 0 }
  for (const c of rows) {
    const s = c.status as keyof typeof totals
    if (s in totals) totals[s] += c.commission_amount_cents
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold">Comisiones de Referido</h2>
        <p className="text-xs text-muted-foreground">
          Solo primer pago por suscripción. Las renovaciones no generan comisión.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pendiente", value: totals.pending, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Aprobada", value: totals.approved, color: "text-blue-600 dark:text-blue-400" },
          { label: "Pagada", value: totals.paid, color: "text-primary" },
          { label: "Anulada", value: totals.void, color: "text-muted-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-xl font-bold tabular-nums ${color}`}>
              ${(value / 100).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Commissions table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          Sin comisiones registradas aún.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Partner</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Período</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Venta</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">% comisión</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Comisión</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.gym_partners?.name ?? "—"}</div>
                    <div className="text-xs font-mono text-muted-foreground">{c.gym_partners?.code ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{c.billing_period}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    ${(c.commission_basis_amount_cents / 100).toFixed(2)} {c.currency.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(c.commission_bps / 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    ${(c.commission_amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      c.status === "paid" ? "text-primary" :
                      c.status === "approved" ? "text-blue-600 dark:text-blue-400" :
                      c.status === "void" ? "text-muted-foreground line-through" :
                      "text-yellow-600 dark:text-yellow-400"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("es-MX")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CommissionStatusActions
                      commissionId={c.id}
                      currentStatus={c.status as "pending" | "approved" | "paid" | "void"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Mostrando máximo 200 comisiones. &quot;Pagada&quot; solo indica registro interno — no se transfiere
        dinero automáticamente.
      </p>
    </div>
  )
}
