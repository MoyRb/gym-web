import { redirect } from "next/navigation"
import { BarChart3, Users, Target, Activity, TrendingUp, Download } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { categoryLabel, formatGoal, getMonthStartIso, goalColor, imcColor, percentage } from "@/lib/fitness-data"
import { getAdminEmails } from "@/lib/supabase/env"

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
  const width = Math.round((value / Math.max(1, max)) * 100)
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
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const supabase = await createClient()
  const service = createServiceRoleClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: adminProfileData } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle()

  const [{ data: usersResult }, { data: profiles }, { data: resources }, { data: routineViews }, { data: pdfEvents }, { data: weeklyEvents }] = await Promise.all([
    service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    service.from("profiles").select("id, goal, bmi_category"),
    service.from("resources").select("id, title, category"),
    service.from("analytics_events").select("metadata").eq("event_type", "routine_viewed"),
    service.from("analytics_events").select("metadata").eq("event_type", "pdf_downloaded"),
    service.from("analytics_events").select("event_type, created_at").order("created_at", { ascending: false }).limit(500),
  ])

  const adminProfile = adminProfileData as { is_admin: boolean | null } | null

  const safeProfiles = (profiles ?? []) as Array<{ goal: string | null; bmi_category: string | null }>
  const safeResources = (resources ?? []) as Array<{ id: string; title: string; category: "nutricion" | "entrenamiento" | "recuperacion" | "motivacion" }>
  const safeRoutineViews = (routineViews ?? []) as Array<{ metadata: unknown }>
  const safePdfEvents = (pdfEvents ?? []) as Array<{ metadata: unknown }>
  const safeWeeklyEvents = (weeklyEvents ?? []) as Array<{ event_type: string; created_at: string }>

  const allowedEmails = getAdminEmails()
  const isAdminByEmail = !!user.email && allowedEmails.includes(user.email.toLowerCase())
  const isAdmin = Boolean(adminProfile?.is_admin) || isAdminByEmail

  if (!isAdmin) redirect("/dashboard")

  const users = usersResult.users ?? []
  const totalUsuarios = users.length
  const monthStart = getMonthStartIso()
  const usuariosNuevosEsteMes = users.filter((u) => u.created_at >= monthStart).length

  const completedProfiles = safeProfiles.filter((p) => p.goal && p.bmi_category).length
  const perfilesCompletados = percentage(completedProfiles, Math.max(1, totalUsuarios))

  const goalCounts = new Map<string, number>()
  const imcCounts = new Map<string, number>()
  for (const profile of safeProfiles) {
    if (profile.goal) goalCounts.set(profile.goal, (goalCounts.get(profile.goal) ?? 0) + 1)
    if (profile.bmi_category) imcCounts.set(profile.bmi_category, (imcCounts.get(profile.bmi_category) ?? 0) + 1)
  }

  const totalGoals = Array.from(goalCounts.values()).reduce((acc, n) => acc + n, 0)
  const totalImc = Array.from(imcCounts.values()).reduce((acc, n) => acc + n, 0)

  const objetivoStats = Array.from(goalCounts.entries())
    .map(([goal, count]) => ({
      objetivo: formatGoal(goal),
      count,
      porcentaje: percentage(count, totalGoals),
      color: goalColor(goal),
    }))
    .sort((a, b) => b.count - a.count)

  const imcStats = Array.from(imcCounts.entries())
    .map(([categoria, count]) => ({
      categoria,
      count,
      porcentaje: percentage(count, totalImc),
      color: imcColor(categoria),
    }))
    .sort((a, b) => b.count - a.count)

  const routineMap = new Map<string, { titulo: string; objetivo: string; vistas: number }>()
  for (const event of safeRoutineViews) {
    const metadata = event.metadata as { rutinaId?: string; rutinaTitle?: string }
    const key = metadata.rutinaId ?? metadata.rutinaTitle
    if (!key) continue
    const current = routineMap.get(key)
    routineMap.set(key, {
      titulo: metadata.rutinaTitle ?? key,
      objetivo: "Plan recomendado",
      vistas: (current?.vistas ?? 0) + 1,
    })
  }

  const routineStats = Array.from(routineMap.values()).sort((a, b) => b.vistas - a.vistas).slice(0, 5)

  const resourcesById = new Map(safeResources.map((r) => [r.id, r]))
  const pdfMap = new Map<string, { titulo: string; categoria: string; descargas: number }>()
  for (const event of safePdfEvents) {
    const metadata = event.metadata as { pdfId?: string; pdfTitle?: string; category?: string }
    const key = metadata.pdfId ?? metadata.pdfTitle
    if (!key) continue

    const resource = metadata.pdfId ? resourcesById.get(metadata.pdfId) : undefined
    const current = pdfMap.get(key)

    pdfMap.set(key, {
      titulo: metadata.pdfTitle ?? resource?.title ?? key,
      categoria: metadata.category ? categoryLabel(metadata.category as "nutricion" | "entrenamiento" | "recuperacion" | "motivacion") : resource?.category ? categoryLabel(resource.category) : "General",
      descargas: (current?.descargas ?? 0) + 1,
    })
  }

  const pdfStats = Array.from(pdfMap.values()).sort((a, b) => b.descargas - a.descargas).slice(0, 5)

  const dailyMap = new Map<string, { registros: number; sesiones: number }>()
  for (const event of safeWeeklyEvents) {
    const key = new Date(event.created_at).toLocaleDateString("es-ES", { weekday: "short", timeZone: "UTC" })
    const current = dailyMap.get(key) ?? { registros: 0, sesiones: 0 }
    if (event.event_type === "register") current.registros += 1
    if (event.event_type === "login") current.sesiones += 1
    dailyMap.set(key, current)
  }

  const dailyActivity = Array.from(dailyMap.entries()).map(([dia, value]) => ({
    dia: dia.charAt(0).toUpperCase() + dia.slice(1),
    ...value,
  }))

  const maxObjetivo = Math.max(1, ...objetivoStats.map((s) => s.porcentaje))
  const maxImc = Math.max(1, ...imcStats.map((s) => s.porcentaje))
  const maxRutinas = Math.max(1, ...routineStats.map((s) => s.vistas))
  const maxPdfs = Math.max(1, ...pdfStats.map((s) => s.descargas))
  const maxSesiones = Math.max(1, ...dailyActivity.map((d) => d.sesiones))
  const maxRegistros = Math.max(1, ...dailyActivity.map((d) => d.registros))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Panel de tendencias</h1>
        </div>
        <p className="text-muted-foreground text-sm flex items-center gap-1.5">
          Datos agregados reales de actividad de FITNESS CLUB.
          <Badge variant="outline" className="text-xs font-normal">Supabase en vivo</Badge>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total de usuarios" value={totalUsuarios} sub="Registrados en la plataforma" icon={Users} accent />
        <StatCard title="Nuevos este mes" value={usuariosNuevosEsteMes} sub="Registros en el mes actual" icon={TrendingUp} />
        <StatCard title="Perfiles completados" value={`${perfilesCompletados}%`} sub="Usuarios con perfil físico completo" icon={Activity} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" />Objetivos más elegidos</CardTitle>
            <CardDescription>Distribución por objetivo principal</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {objetivoStats.map((s) => (
              <HorizontalBar key={s.objetivo} label={s.objetivo} value={s.porcentaje} max={maxObjetivo} color={s.color} count={s.count} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />Categorías de IMC</CardTitle>
            <CardDescription>Distribución del IMC entre los miembros</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {imcStats.map((s) => (
              <HorizontalBar key={s.categoria} label={s.categoria} value={s.porcentaje} max={maxImc} color={s.color} count={s.count} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-primary" />Rutinas más vistas</CardTitle>
            <CardDescription>Número de visualizaciones por rutina</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {routineStats.map((r) => (
              <div key={r.titulo} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{r.titulo}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{r.objetivo}</Badge>
                  </div>
                  <span className="font-semibold ml-2 shrink-0">{r.vistas}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.round((r.vistas / maxRutinas) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4 text-primary" />PDFs más descargados</CardTitle>
            <CardDescription>Material descargado por los miembros</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {pdfStats.map((p) => (
              <div key={p.titulo} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium truncate">{p.titulo}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">{p.categoria}</Badge>
                  </div>
                  <span className="font-semibold ml-2 shrink-0">{p.descargas}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-secondary transition-all duration-700" style={{ width: `${Math.round((p.descargas / maxPdfs) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />Actividad semanal</CardTitle>
          <CardDescription>Sesiones y nuevos registros (últimos 7 días)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 h-32">
            {dailyActivity.map((d) => (
              <div key={d.dia} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex flex-1 w-full items-end gap-1">
                  <div className="flex-1 rounded-t-md bg-secondary/70 transition-all duration-700 min-h-1" style={{ height: `${Math.round((d.sesiones / maxSesiones) * 100)}%` }} title={`${d.sesiones} sesiones`} />
                  <div className="flex-1 rounded-t-md bg-primary transition-all duration-700 min-h-1" style={{ height: `${Math.round((d.registros / maxRegistros) * 100)}%` }} title={`${d.registros} registros`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{d.dia}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
