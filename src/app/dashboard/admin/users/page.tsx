import { requireAdmin } from "@/lib/auth/guards"
import { getUserStats } from "@/lib/admin/queries"
import { KpiCard } from "@/components/admin/KpiCard"
import { DataBar } from "@/components/admin/DataBar"
import { formatGoalLabel, formatExperienceLabel, formatSexLabel } from "@/lib/admin/utils"

export default async function AdminUsersPage() {
  await requireAdmin()

  const stats = await getUserStats()

  const maxGoal = Math.max(1, ...(stats.by_goal.map((g) => g.count)))
  const maxExp  = Math.max(1, ...(stats.by_experience.map((e) => e.count)))
  const maxDays = Math.max(1, ...(stats.by_days_per_week.map((d) => d.count)))
  const maxSex  = Math.max(1, ...(stats.by_sex.map((s) => s.count)))

  return (
    <div className="flex flex-col gap-6">

      {/* ── KPIs ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <KpiCard
          label="Total usuarios"
          value={stats.total_users}
          sub="registrados"
          accent
        />
        <KpiCard
          label="Con plan activo"
          value={stats.users_with_active_plan}
          sub="workout plan activo"
        />
        <KpiCard
          label="Han entrenado"
          value={stats.users_with_any_session}
          sub="al menos 1 sesión iniciada"
        />
      </div>

      {/* ── Roles ──────────────────────────────────────── */}
      {stats.by_role.length > 0 && (
        <div className="rounded border border-border bg-card p-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Roles del sistema
          </p>
          <div className="flex flex-wrap gap-4">
            {stats.by_role.map((r) => (
              <div key={r.role} className="flex flex-col">
                <span className="text-2xl font-bold tabular-nums">{r.count}</span>
                <span className="text-[11px] text-muted-foreground capitalize">{r.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Distributions ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Distribución por objetivo
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
            Distribución por experiencia
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
                  color="muted"
                />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Distribución por días / semana
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
                  color="primary"
                />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Distribución por sexo
          </h2>
          {stats.by_sex.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin datos</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.by_sex.map((s) => (
                <DataBar
                  key={s.sex}
                  label={formatSexLabel(s.sex)}
                  value={s.count}
                  max={maxSex}
                  displayValue={s.count}
                  color="muted"
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Privacy note ───────────────────────────────── */}
      <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
        Esta vista muestra únicamente métricas agregadas. No se exponen emails, nombres
        ni datos individuales de entrenamiento. El objetivo de Alpha Trainer Gym Insights
        es <strong>aggregate demand intelligence</strong>, no comercialización de PII.
      </p>
    </div>
  )
}
