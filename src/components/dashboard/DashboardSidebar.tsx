"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, User, FileText, LogOut, Settings, Menu, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { GymLogo } from "@/components/layout/GymLogo"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/perfil", icon: User, label: "Mi perfil" },
  { href: "/dashboard/recursos", icon: FileText, label: "Material" },
]

const adminItems = [
  { href: "/dashboard/admin", icon: BarChart3, label: "Tendencias" },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card transition-all duration-200",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Header */}
        <div className={cn("flex h-16 items-center border-b border-border", isCollapsed ? "justify-center px-3" : "justify-between px-4")}>
          {!isCollapsed && <GymLogo href="/dashboard" />}
          {isCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
              <span className="text-xs font-black text-primary-foreground">FC</span>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Colapsar"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-2 py-4">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            )
          })}

          {!isCollapsed && (
            <div className="mt-4 mb-1 px-3">
              <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider">Admin</p>
            </div>
          )}
          {isCollapsed && <div className="my-2 h-px bg-border mx-2" />}

          {adminItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className={cn("flex flex-col gap-1 border-t border-border p-2 pb-4", isCollapsed && "items-center")}>
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mb-2"
              aria-label="Expandir"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isCollapsed && "w-auto justify-center px-2"
            )}
            title={isCollapsed ? "Configuración" : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Configuración</span>}
          </button>
          <Link
            href="/login"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              isCollapsed && "w-auto justify-center px-2"
            )}
            title={isCollapsed ? "Cerrar sesión" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Cerrar sesión</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background md:hidden">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
        <Link
          href="/dashboard/admin"
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
            pathname === "/dashboard/admin" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="h-5 w-5" />
          <span>Admin</span>
        </Link>
        <Link href="/login" className="flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors">
          <LogOut className="h-5 w-5" />
          <span>Salir</span>
        </Link>
      </nav>
    </>
  )
}
