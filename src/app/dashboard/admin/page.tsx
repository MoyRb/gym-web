import { requireAdmin } from "@/lib/auth/guards"
import { getOverviewStats, getDailyTrend } from "@/lib/admin/queries"
import { KpiCard } from "@/components/admin/KpiCard"
import { SparkBars } from "@/components/admin/SparkBars"
import { completionRate, formatDuration } from "@/lib/admin/utils"

export default async function AdminOverviewPage() {
  await requireAdmin()

  const [stats, trend30] = await Promise.all([
    getOverviewStats(),
    getDailyTrend(30),
  ])

  const sessionCompletionRate = completionRate(stats.sessions_completed, stats.sessions_total)
  const aiCompletionRate      = completionRate(stats.ai_gen_completed,   stats.ai_gen_total)

  const trendSessionData = trend30.map((d) => ({
    label: d.day.slice(5),          // "MM-DD"
    value: d.sessions_started,
  }))
  const trendUserData = trend30.map((d) => ({
    label: d.day.slice(5),
    value: d.new_users,
  }))

  return (
    <div className="flex flex-col gap-6">

      {/* ── Users ──────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Usuarios
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Total"
            value={stats.total_users}
            sub="registrados"
            accent
          />
          <KpiCard
            label="Nuevos 7d"
            value={stats.new_users_7d}
          />
          <KpiCard
            label="Nuevos 30d"
            value={stats.new_users_30d}
          />
          <KpiCard
            label="Activos 7d"
            value={stats.active_users_7d}
            sub="≥1 sesión"
          />
          <KpiCard
            label="Activos 30d"
            value={stats.active_users_30d}
            sub="≥1 sesión"
          />
        </div>
      </section>

      {/* ── Sessions ───────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Sesiones de entrenamiento
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total"      value={stats.sessions_total}     />
          <KpiCard label="Completadas" value={stats.sessions_completed} positive />
          <KpiCard
            label="Completion rate"
            value={sessionCompletionRate !== null ? `${sessionCompletionRate}%` : "—"}
            sub="sobre total iniciadas"
          />
          <KpiCard label="Duración media" value={formatDuration(stats.avg_duration_seconds)} sub="sesiones completadas" />
          <KpiCard label="Sesiones 7d"    value={stats.sessions_7d}    />
          <KpiCard label="Sesiones 30d"   value={stats.sessions_30d}   />
        </div>
      </section>

      {/* ── Plans ──────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Planes de entrenamiento
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiCard label="Generados por AI" value={stats.plans_ai}       accent />
          <KpiCard label="Desde plantilla"  value={stats.plans_template} />
          <KpiCard label="Manuales"         value={stats.plans_manual}   />
          <KpiCard label="Borradores"       value={stats.plans_draft}    sub="pendientes de finalizar" />
        </div>
      </section>

      {/* ── AI Generations ─────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Generaciones AI
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Total"       value={stats.ai_gen_total}       />
          <KpiCard label="Completadas" value={stats.ai_gen_completed}   positive />
          <KpiCard label="Fallidas"    value={stats.ai_gen_failed}      />
          <KpiCard label="En progreso" value={stats.ai_gen_in_progress} />
          <KpiCard
            label="Completion rate"
            value={aiCompletionRate !== null ? `${aiCompletionRate}%` : "—"}
          />
        </div>
      </section>

      {/* ── 30-day Trends ──────────────────────────────── */}
      {trend30.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tendencias — últimos 30 días
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Sesiones por día
              </p>
              <SparkBars
                data={trendSessionData}
                height={52}
                color="#CF2020"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Total 30d: <span className="font-semibold text-foreground">{stats.sessions_30d}</span>
                {" · "}Completadas: <span className="font-semibold text-foreground">{stats.sessions_completed_30d}</span>
              </p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Nuevos usuarios por día
              </p>
              <SparkBars
                data={trendUserData}
                height={52}
                color="#34D399"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Total 30d: <span className="font-semibold text-foreground">{stats.new_users_30d}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Definition footnote ────────────────────────── */}
      <p className="text-[10px] text-muted-foreground border-t border-border pt-3">
        <strong>Active user (CORTE 1):</strong> usuario con al menos una workout_session registrada en el periodo, independientemente del status de la sesión.
      </p>
    </div>
  )
}
