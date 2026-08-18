import { requireAdmin } from "@/lib/auth/guards"
import { getTrainingStats } from "@/lib/admin/queries"
import { KpiCard } from "@/components/admin/KpiCard"
import { DataBar } from "@/components/admin/DataBar"

export default async function AdminTrainingPage() {
  await requireAdmin()

  const stats = await getTrainingStats()

  const maxSessionsByEx  = Math.max(1, ...(stats.top_exercises_by_sessions.map((e) => e.session_count ?? 0)))
  const maxSetsByEx      = Math.max(1, ...(stats.top_exercises_by_sets.map((e) => e.completed_sets ?? 0)))
  const maxBodyPart      = Math.max(1, ...(stats.top_body_parts.map((b) => b.session_count)))
  const maxTarget        = Math.max(1, ...(stats.top_targets.map((t) => t.session_count)))

  const noData = stats.top_exercises_by_sessions.length === 0

  return (
    <div className="flex flex-col gap-6">

      {/* ── KPIs ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
        <KpiCard
          label="Ejercicios por sesión"
          value={stats.avg_exercises_per_session ?? "—"}
          sub="promedio"
        />
        <KpiCard
          label="Series por sesión completada"
          value={stats.avg_sets_per_completed_session ?? "—"}
          sub="promedio"
        />
      </div>

      {noData && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Sin datos de sesiones todavía. Los datos aparecerán cuando los usuarios comiencen a entrenar.
        </p>
      )}

      {!noData && (
        <>
          {/* ── Top exercises by sessions ──────────────── */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Top ejercicios por apariciones en sesiones
            </h2>
            <div className="rounded border border-border bg-card overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ejercicio</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Grupo muscular</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Equipo</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Sesiones</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.top_exercises_by_sessions.map((ex, i) => (
                    <tr key={ex.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium max-w-[180px] truncate">{ex.name}</td>
                      <td className="px-3 py-2 text-muted-foreground capitalize hidden sm:table-cell">{ex.body_part}</td>
                      <td className="px-3 py-2 text-muted-foreground capitalize hidden md:table-cell">{ex.equipment}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">
                        {ex.session_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Top exercises by completed sets ────────── */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Top ejercicios por series completadas
            </h2>
            <div className="flex flex-col gap-2">
              {stats.top_exercises_by_sets.map((ex) => (
                <DataBar
                  key={ex.id}
                  label={ex.name}
                  value={ex.completed_sets ?? 0}
                  max={maxSetsByEx}
                  displayValue={ex.completed_sets}
                  sub={ex.body_part}
                />
              ))}
            </div>
          </section>

          {/* ── Body parts + Targets ───────────────────── */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Grupos musculares más entrenados
              </h2>
              <div className="flex flex-col gap-2">
                {stats.top_body_parts.map((bp) => (
                  <DataBar
                    key={bp.body_part}
                    label={bp.body_part}
                    value={bp.session_count}
                    max={maxBodyPart}
                    displayValue={bp.session_count}
                    color="primary"
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Músculos objetivo más trabajados
              </h2>
              <div className="flex flex-col gap-2">
                {stats.top_targets.slice(0, 12).map((t) => (
                  <DataBar
                    key={t.target}
                    label={t.target}
                    value={t.session_count}
                    max={maxTarget}
                    displayValue={t.session_count}
                    color="muted"
                  />
                ))}
              </div>
            </section>
          </div>

          {/* ── By sessions table (compact) ────────────── */}
          <section className="flex flex-col gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Distribución de sesiones por ejercicio (top 10)
            </h2>
            <div className="flex flex-col gap-2">
              {stats.top_exercises_by_sessions.map((ex) => (
                <DataBar
                  key={ex.id}
                  label={ex.name}
                  value={ex.session_count ?? 0}
                  max={maxSessionsByEx}
                  displayValue={ex.session_count}
                  sub={ex.body_part}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
