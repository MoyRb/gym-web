import { requireAdmin } from "@/lib/auth/guards"
import { getEquipmentStats } from "@/lib/admin/queries"
import { formatGrowth, formatNumber } from "@/lib/admin/utils"

export default async function AdminEquipmentPage() {
  await requireAdmin()

  const equipment = await getEquipmentStats()

  const noData = equipment.length === 0

  return (
    <div className="flex flex-col gap-6">

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground max-w-prose">
          Inteligencia de equipamiento basada en el uso real en sesiones de entrenamiento.
          Esta vista es la base futura de <strong>Alpha Trainer Gym Insights</strong>.
        </p>
      </div>

      {noData ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Sin datos de sesiones todavía. Los datos aparecerán cuando los usuarios comiencen a entrenar.
        </p>
      ) : (
        <>
          {/* ── Equipment table ────────────────────────── */}
          <div className="rounded border border-border bg-card overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Equipamiento</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Sesiones</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Usuarios únicos</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Series compl.</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Share</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">30d</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Prev 30d</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Growth</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((eq) => {
                  const growth = formatGrowth(eq.growth_pct)
                  return (
                    <tr
                      key={eq.equipment}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-medium capitalize">{eq.equipment}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(eq.session_occurrences)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(eq.unique_users)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(eq.completed_sets)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {eq.share_pct !== null ? `${eq.share_pct}%` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(eq.sessions_30d)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatNumber(eq.sessions_prev_30d)}
                      </td>
                      <td
                        className={[
                          "px-3 py-2.5 text-right tabular-nums font-medium",
                          growth.positive === true
                            ? "text-emerald-400"
                            : growth.positive === false
                            ? "text-destructive"
                            : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {growth.text}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Future context ─────────────────────────── */}
          <div className="rounded border border-border/50 bg-muted/20 p-3 text-[11px] text-muted-foreground">
            <strong className="text-foreground/70">Gym Insights (futuro):</strong>{" "}
            Esta inteligencia será encapsulada con un scope de{" "}
            <code className="font-mono">organization_id</code> para producir reportes
            de demanda de equipamiento por gimnasio. Hoy el scope es global.
          </div>
        </>
      )}
    </div>
  )
}
