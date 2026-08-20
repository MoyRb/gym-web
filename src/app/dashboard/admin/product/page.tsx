import { requireAdmin } from "@/lib/auth/guards"
import { getProductStats, getFunnelStats } from "@/lib/admin/queries"
import { KpiCard } from "@/components/admin/KpiCard"
import { completionRate, formatEventLabel } from "@/lib/admin/utils"

export default async function AdminProductPage() {
  await requireAdmin()

  const [product, funnel] = await Promise.all([getProductStats(), getFunnelStats()])

  const workoutCompletionRate = completionRate(
    product.event_counts.find((e) => e.event_type === "workout_completed")?.total ?? 0,
    product.event_counts.find((e) => e.event_type === "workout_started")?.total ?? 0,
  )

  return (
    <div className="flex flex-col gap-6">

      {/* ── Engagement ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="DAU" value={product.dau} sub="últimas 24 h" accent />
        <KpiCard label="WAU" value={product.wau} sub="últimos 7 días" />
        <KpiCard label="MAU" value={product.mau} sub="últimos 30 días" />
      </div>

      {/* ── Funnel ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Funnel de activación
        </h2>
        <div className="rounded border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Paso
                </th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Usuarios
                </th>
                <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Conversión
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Registrados",          value: funnel.signups,     prev: null               },
                { label: "Perfil completo",       value: funnel.profiles,    prev: funnel.signups      },
                { label: "Con plan activo",       value: funnel.plans,       prev: funnel.profiles     },
                { label: "Han entrenado",         value: funnel.sessions,    prev: funnel.plans        },
                { label: "Sesión completada",     value: funnel.completions, prev: funnel.sessions     },
              ].map(({ label, value, prev }) => {
                const rate = prev !== null ? completionRate(value, prev) : null
                return (
                  <tr key={label} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 text-sm">{label}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{value}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {rate !== null ? `${rate}%` : "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Workout completion rate KPI ─────────────────────── */}
      {workoutCompletionRate !== null && (
        <div className="grid grid-cols-2 gap-2">
          <KpiCard
            label="Tasa compl. workout"
            value={`${workoutCompletionRate}%`}
            sub="started → completed"
            positive={workoutCompletionRate >= 50}
          />
        </div>
      )}

      {/* ── Event counts table ──────────────────────────────── */}
      {product.event_counts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Sin eventos todavía. Los datos aparecerán una vez que los usuarios comiencen a usar la app.
        </p>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Eventos por ventana temporal
          </h2>
          <div className="rounded border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Evento
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    24 h
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    7 días
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    30 días
                  </th>
                  <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.event_counts.map((ev) => (
                  <tr key={ev.event_type} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 text-sm">
                      <span className="text-foreground">{formatEventLabel(ev.event_type)}</span>
                      <span className="ml-2 text-[11px] text-muted-foreground/60 font-mono">
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{ev.c24h}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{ev.c7d}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{ev.c30d}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{ev.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground">
            DAU/WAU/MAU excluyen eventos de auth (register, login) y setup (profile_completed).
          </p>
        </section>
      )}

    </div>
  )
}
