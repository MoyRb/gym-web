import { requireAdmin } from "@/lib/auth/guards"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { siteConfig } from "@/config/site"
import { PartnerDetailClient } from "./PartnerDetailClient"

export const metadata = {
  title: "Partner Detail — Admin",
  robots: { index: false, follow: false },
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export default async function AdminPartnerDetailPage(context: RouteContext) {
  await requireAdmin()

  const { id } = await context.params
  const service = createServiceRoleClient()

  // Fetch partner
  const { data: partner } = await service
    .from("gym_partners")
    .select("id, name, code, status, monthly_commission_bps, long_term_commission_bps, created_at, updated_at")
    .eq("id", id)
    .maybeSingle()

  if (!partner) notFound()

  // Fetch metrics
  const [attributionsResult, commissionsResult] = await Promise.all([
    service
      .from("referral_attributions")
      .select("id, billing_period, attributed_at")
      .eq("gym_partner_id", id),
    service
      .from("referral_commissions")
      .select("id, billing_period, commission_basis_amount_cents, commission_amount_cents, status, created_at")
      .eq("gym_partner_id", id)
      .order("created_at", { ascending: false }),
  ])

  const attributions = attributionsResult.data ?? []
  const commissions = commissionsResult.data ?? []

  // Compute metrics
  const byPeriod = { monthly: 0, semiannual: 0, annual: 0 }
  let grossRevenue = 0
  const byStatus = { pending: 0, approved: 0, paid: 0, void: 0 }

  for (const c of commissions) {
    const period = c.billing_period as keyof typeof byPeriod
    if (c.status !== "void") {
      if (period in byPeriod) byPeriod[period]++
      grossRevenue += c.commission_basis_amount_cents
    }
    const s = c.status as keyof typeof byStatus
    if (s in byStatus) byStatus[s] += c.commission_amount_cents
  }

  const referralUrl = `${siteConfig.url}/r/${partner.code}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/admin/partners"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Partners
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{partner.name}</span>
      </div>

      {/* Partner info + edit */}
      <PartnerDetailClient partner={partner} referralUrl={referralUrl} />

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Referidos convertidos", value: attributions.length },
          { label: "Ventas mensuales", value: byPeriod.monthly },
          { label: "Ventas semianuales", value: byPeriod.semiannual },
          { label: "Ventas anuales", value: byPeriod.annual },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Revenue atribuido (bruto)", value: `$${(grossRevenue / 100).toFixed(2)}` },
          { label: "Comisión pendiente", value: `$${(byStatus.pending / 100).toFixed(2)}` },
          { label: "Comisión aprobada", value: `$${(byStatus.approved / 100).toFixed(2)}` },
          { label: "Comisión pagada", value: `$${(byStatus.paid / 100).toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent commissions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Comisiones recientes</h3>
        {commissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin comisiones aún.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Período</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Venta</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">Comisión</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commissions.slice(0, 20).map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 capitalize">{c.billing_period}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      ${(c.commission_basis_amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      ${(c.commission_amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${
                        c.status === "paid" ? "text-primary" :
                        c.status === "approved" ? "text-blue-600 dark:text-blue-400" :
                        c.status === "void" ? "text-muted-foreground line-through" :
                        "text-yellow-600 dark:text-yellow-400"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {new Date(c.created_at).toLocaleDateString("es-MX")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-2 text-right">
          <Link
            href="/dashboard/admin/partners/commissions"
            className="text-xs text-primary hover:underline"
          >
            Ver todas las comisiones →
          </Link>
        </div>
      </div>
    </div>
  )
}
