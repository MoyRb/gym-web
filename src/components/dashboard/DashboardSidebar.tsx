"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  User,
  Menu,
  BarChart3,
  Dumbbell,
  ListChecks,
  TrendingUp,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/layout/BrandMark"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

const desktopNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/rutina", icon: Dumbbell, label: "Mi rutina" },
  { href: "/dashboard/exercises", icon: ListChecks, label: "Ejercicios" },
  { href: "/dashboard/progress", icon: TrendingUp, label: "Progreso" },
  { href: "/dashboard/recursos", icon: BookOpen, label: "Biblioteca" },
  { href: "/dashboard/perfil", icon: User, label: "Perfil" },
]

const adminNavItem = { href: "/dashboard/admin", icon: BarChart3, label: "Administración" }

const mobileNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/rutina", icon: Dumbbell, label: "Mi rutina" },
  { href: "/dashboard/exercises", icon: ListChecks, label: "Ejercicios" },
  { href: "/dashboard/progress", icon: TrendingUp, label: "Progreso" },
  { href: "/dashboard/perfil", icon: User, label: "Perfil" },
]

interface DashboardSidebarProps {
  isAdmin: boolean
}

export function DashboardSidebar({ isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const allDesktopItems = isAdmin ? [...desktopNavItems, adminNavItem] : desktopNavItems

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-card transition-all duration-200",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-border", isCollapsed ? "justify-center px-3" : "justify-between px-4")}>
          {!isCollapsed && <BrandMark href="/dashboard" variant="sidebar" />}
          {isCollapsed && <BrandMark href="/dashboard" variant="sidebar" className="text-[10px] tracking-[0.02em] text-center leading-tight" />}
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

        <nav className="flex flex-1 flex-col gap-1 p-2 py-4">
          {allDesktopItems.map(({ href, icon: Icon, label }) => {
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
          <ThemeToggle collapsed={isCollapsed} />
        </div>
      </aside>

      {/* Mobile bottom nav — exactly 5 items */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background md:hidden pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        style={{ height: "var(--nav-bottom-height)" }}
      >
        {mobileNavItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
