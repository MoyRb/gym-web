import { requireAdmin } from "@/lib/auth/guards"
import { getAiStats } from "@/lib/admin/queries"
import { KpiCard } from "@/components/admin/KpiCard"
import { DataBar } from "@/components/admin/DataBar"
import { completionRate, formatDuration, formatGoalLabel, formatExperienceLabel } from "@/lib/admin/utils"

export default async function AdminAiPage() {
  await requireAdmin()

  const stats = await getAiStats()

  const rate = completionRate(stats.completed, stats.total)

  const maxGoal = Math.max(1, ...(stats.by_goal.map((g) => g.count)))
  const maxExp  = Math.max(1, ...(stats.by_experience.map((e) => e.count)))
  const maxDays = Math.max(1, ...(stats.by_days_per_week.map((d) => d.count)))

  return (
    <div className="flex flex-col gap-6">

      {/* ── KPIs ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Total generaciones"  value={stats.total}     accent />
        <KpiCard label="Completadas"         value={stats.completed} positive />
        <KpiCard label="Fallidas"            value={stats.failed}    />
        <KpiCard label="En progreso"         value={stats.in_progress} />
        <KpiCard
          label="Completion rate"
          value={rate !== null ? `${rate}%` : "—"}
        />
      </div>

      {/* ── Timing ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          label="Avg batches por generación"
          value={stats.avg_batches_completed ?? "—"}
          sub="generaciones completadas"
        />
        <KpiCard
          label="Tiempo medio de generación"
          value={formatDuration(stats.avg_completion_seconds)}
          sub="completadas (wall time)"
        />
      </div>

      {/* ── Observability placeholder ───────────────────── */}
      <div className="rounded border border-border/50 bg-muted/20 p-3 text-[11px] text-muted-foreground">
        <strong className="text-foreground/70">Token / cost observability:</strong>{" "}
        Los datos de consumo de tokens y coste por generación requieren instrumentación adicional.
        Los campos correspondientes no están persistidos todavía. Ver{" "}
        <code className="font-mono">docs/analytics-events-roadmap.md</code>.
      </div>

      {/* ── Distributions ──────────────────────────────── */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">

          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Por objetivo
            </h2>
            {stats.by_goal.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin datos</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.by_goal.map((g) => (
                  <DataBar
                    key={g.goal}
                    label={formatGoalLabel(g.goal)}
                    value={g.count}
                    max={maxGoal}
                    displayValue={g.count}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Por experiencia
            </h2>
            {stats.by_experience.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin datos</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.by_experience.map((e) => (
                  <DataBar
                    key={e.experience}
                    label={formatExperienceLabel(e.experience)}
                    value={e.count}
                    max={maxExp}
                    displayValue={e.count}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Por días / semana
            </h2>
            {stats.by_days_per_week.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin datos</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.by_days_per_week.map((d) => (
                  <DataBar
                    key={d.days_per_week}
                    label={`${d.days_per_week} días`}
                    value={d.count}
                    max={maxDays}
                    displayValue={d.count}
                    color="muted"
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {stats.total === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Sin generaciones AI todavía. Los datos aparecerán una vez que los usuarios generen planes con AI.
        </p>
      )}
    </div>
  )
}
