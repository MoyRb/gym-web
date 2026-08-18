"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Dumbbell,
  ListChecks,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

const desktopNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/rutina", icon: Dumbbell, label: "Mi plan" },
  { href: "/dashboard/exercises", icon: ListChecks, label: "Ejercicios" },
  { href: "/dashboard/progress", icon: TrendingUp, label: "Progreso" },
  { href: "/dashboard/perfil", icon: User, label: "Perfil" },
]

const adminNavItem = { href: "/dashboard/admin", icon: BarChart3, label: "Admin" }

const mobileNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/rutina", icon: Dumbbell, label: "Plan" },
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
      {/* Desktop sidebar — always dark */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo row */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border",
            isCollapsed ? "justify-center px-3" : "justify-between px-4"
          )}
        >
          {!isCollapsed && (
            <AlphaTrainerLogo href="/dashboard" variant="light" height={22} />
          )}
          <button
            onClick={() => setIsCollapsed((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 py-3">
          {allDesktopItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
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

        {/* Footer — theme toggle + biblioteca */}
        <div
          className={cn(
            "flex flex-col gap-0.5 border-t border-sidebar-border p-2 pb-4",
            isCollapsed && "items-center"
          )}
        >
          {!isCollapsed && (
            <Link
              href="/dashboard/recursos"
              className={cn(
                "flex items-center gap-3 rounded px-3 py-2 text-xs font-medium transition-colors",
                pathname === "/dashboard/recursos"
                  ? "text-sidebar-foreground"
                  : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
              )}
            >
              Biblioteca
            </Link>
          )}
          <div className={cn("mt-1", isCollapsed && "w-full flex justify-center")}>
            <ThemeToggle collapsed={isCollapsed} />
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-background md:hidden pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        style={{ height: "var(--nav-bottom-height)" }}
      >
        {mobileNavItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
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
