"use client"

import { BarChart3, Users, Target, Activity, FileText, TrendingUp, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  mockAdminStats,
  mockObjetivoStats,
  mockImcStats,
  mockRoutineStats,
  mockPdfStats,
  mockDailyActivity,
} from "@/data/admin-mock-data"

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <Card className={accent ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="flex items-start justify-between gap-4 pt-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-black">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-primary/15" : "bg-muted"}`}>
          <Icon className={`h-6 w-6 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  )
}

function HorizontalBar({
  label,
  value,
  max,
  color,
  count,
}: {
  label: string
  value: number
  max: number
  color: string
  count: number
}) {
  const width = Math.round((value / max) * 100)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{count}</span>
          <span className="font-semibold text-xs">{value}%</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function AdminPage() {
  const maxObjetivo = Math.max(...mockObjetivoStats.map((s) => s.porcentaje))
  const maxImc = Math.max(...mockImcStats.map((s) => s.porcentaje))
  const maxRutinas = Math.max(...mockRoutineStats.map((s) => s.vistas))
  const maxPdfs = Math.max(...mockPdfStats.map((s) => s.descargas))
  const maxSesiones = Math.max(...mockDailyActivity.map((d) => d.sesiones))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Panel de tendencias</h1>
        </div>
        <p className="text-muted-foreground text-sm flex items-center gap-1.5">
          Datos de actividad de los miembros del gimnasio.
          <Badge variant="outline" className="text-xs font-normal">Datos mock — conectar Supabase</Badge>
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total de usuarios"
          value={mockAdminStats.totalUsuarios}
          sub="Registrados en la plataforma"
          icon={Users}
          accent
        />
        <StatCard
          title="Nuevos este mes"
          value={mockAdminStats.usuariosNuevosEsteMes}
          sub="Registros en los últimos 30 días"
          icon={TrendingUp}
        />
        <StatCard
          title="Perfiles completados"
          value={`${mockAdminStats.perfilesCompletados}%`}
          sub="De usuarios con perfil físico"
          icon={Activity}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Objectives */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Objetivos más elegidos
            </CardTitle>
            <CardDescription>Distribución por objetivo principal</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mockObjetivoStats.map((s) => (
              <HorizontalBar
                key={s.objetivo}
                label={s.objetivo}
                value={s.porcentaje}
                max={maxObjetivo}
                color={s.color}
                count={s.count}
              />
            ))}
          </CardContent>
        </Card>

        {/* IMC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Categorías de IMC
            </CardTitle>
            <CardDescription>Distribución del IMC entre los miembros</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mockImcStats.map((s) => (
              <HorizontalBar
                key={s.categoria}
                label={s.categoria}
                value={s.porcentaje}
                max={maxImc}
                color={s.color}
                count={s.count}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Routines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Rutinas más vistas
            </CardTitle>
            <CardDescription>Número de veces que se visualizó cada rutina</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mockRoutineStats.map((r) => (
              <div key={r.titulo} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{r.titulo}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{r.objetivo}</Badge>
                  </div>
                  <span className="font-semibold ml-2 shrink-0">{r.vistas}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.round((r.vistas / maxRutinas) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* PDFs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-primary" />
              PDFs más descargados
            </CardTitle>
            <CardDescription>Material descargado por los miembros</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {mockPdfStats.map((p) => (
              <div key={p.titulo} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{p.titulo}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{p.categoria}</Badge>
                  </div>
                  <span className="font-semibold ml-2 shrink-0">{p.descargas}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-secondary transition-all duration-700"
                    style={{ width: `${Math.round((p.descargas / maxPdfs) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Daily activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" />
            Actividad semanal
          </CardTitle>
          <CardDescription>Sesiones y nuevos registros por día</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-32">
            {mockDailyActivity.map((d) => (
              <div key={d.dia} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex flex-1 w-full items-end gap-1">
                  {/* Sessions bar */}
                  <div
                    className="flex-1 rounded-t-md bg-secondary/70 transition-all duration-700 min-h-1"
                    style={{ height: `${Math.round((d.sesiones / maxSesiones) * 100)}%` }}
                    title={`${d.sesiones} sesiones`}
                  />
                  {/* Registrations bar */}
                  <div
                    className="flex-1 rounded-t-md bg-primary transition-all duration-700 min-h-1"
                    style={{ height: `${Math.round((d.registros / Math.max(...mockDailyActivity.map((x) => x.registros))) * 100)}%` }}
                    title={`${d.registros} registros`}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{d.dia}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-secondary/70" />
              <span>Sesiones</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
              <span>Nuevos registros</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TODO note */}
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-primary">Para conectar Supabase:</span>{" "}
          Reemplaza los imports de <code className="text-xs bg-muted px-1 py-0.5 rounded">@/data/admin-mock-data</code> por queries a las tablas{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">profiles</code>,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">events</code> y{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">routine_views</code>.
        </p>
      </div>
    </div>
  )
}
