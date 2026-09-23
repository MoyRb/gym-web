import { requireAdmin } from "@/lib/auth/guards"
import { createServiceRoleClient } from "@/lib/supabase/server"
import Link from "next/link"
import { siteConfig } from "@/config/site"
import { CreatePartnerForm } from "./CreatePartnerForm"

export const metadata = {
  title: "Gym Partners — Admin",
  robots: { index: false, follow: false },
}

export default async function AdminPartnersPage() {
  await requireAdmin()

  const service = createServiceRoleClient()

  // Fetch all partners
  const { data: partners } = await service
    .from("gym_partners")
    .select("id, name, code, status, monthly_commission_bps, long_term_commission_bps, created_at")
    .order("created_at", { ascending: false })

  // Fetch commission summary per partner
  const { data: commissionSummary } = await service
    .from("referral_commissions")
    .select("gym_partner_id, status, commission_amount_cents")

  // Aggregate commissions per partner
  const commissionsByPartner: Record<string, { pending: number; approved: number; paid: number }> = {}
  for (const row of commissionSummary ?? []) {
    if (!commissionsByPartner[row.gym_partner_id]) {
      commissionsByPartner[row.gym_partner_id] = { pending: 0, approved: 0, paid: 0 }
    }
    const s = row.status as "pending" | "approved" | "paid" | "void"
    if (s === "pending" || s === "approved" || s === "paid") {
      commissionsByPartner[row.gym_partner_id][s] += row.commission_amount_cents
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Gym Partners</h2>
          <p className="text-xs text-muted-foreground">
            Gimnasios afiliados y sus comisiones de referido
          </p>
        </div>
        <CreatePartnerForm />
      </div>

      {/* Partners table */}
      {(!partners || partners.length === 0) ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          No hay gimnasios registrados aún.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Mensual bps</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">L/T bps</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pendiente</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pagado</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partners.map((p) => {
                const cm = commissionsByPartner[p.id]
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        p.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {p.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.monthly_commission_bps}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.long_term_commission_bps}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {cm?.pending ? `$${(cm.pending / 100).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-primary">
                      {cm?.paid ? `$${(cm.paid / 100).toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/partners/${p.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Referral URL format reminder */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Formato URL de referido:</strong>{" "}
        <code className="font-mono">{siteConfig.url}/r/[CÓDIGO]</code>
        {" "}— El código es el QR que el gimnasio comparte con sus miembros.
      </div>
    </div>
  )
}
