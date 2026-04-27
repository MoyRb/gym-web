"use client"

import { useSyncExternalStore } from "react"
import { Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

type ThemeToggleProps = {
  collapsed?: boolean
  className?: string
}

export function ThemeToggle({ collapsed = false, className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  )

  const isDark = mounted ? resolvedTheme === "dark" : false
  const ariaLabel = mounted
    ? (isDark ? "Activar modo claro" : "Activar modo oscuro")
    : "Cambiar tema"
  const label = mounted ? (isDark ? "Modo oscuro" : "Modo claro") : "Tema"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-lg border border-border/70 bg-card/70 px-3 py-2 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:text-foreground hover:shadow-md",
        collapsed && "h-10 w-10 justify-center px-0 py-0",
        className
      )}
      title={collapsed ? "Alternar tema" : undefined}
      aria-label={ariaLabel}
      aria-pressed={mounted ? isDark : undefined}
    >
      <span className={cn("relative flex h-5 w-10 items-center rounded-full transition-colors", isDark ? "bg-primary/70" : "bg-secondary/30", collapsed && "hidden")}>
        <span
          className={cn(
            "absolute left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-foreground shadow transition-transform",
            isDark && "translate-x-5"
          )}
        >
          {isDark ? <Moon className="h-3 w-3" /> : <SunMedium className="h-3 w-3" />}
        </span>
      </span>

      {collapsed ? (
        isDark ? <Moon className="h-4 w-4 shrink-0 text-primary" /> : <SunMedium className="h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <span className="flex items-center gap-1.5">
          {isDark ? <Moon className="h-4 w-4 text-primary" /> : <SunMedium className="h-4 w-4 text-amber-500" />}
          <span>{label}</span>
        </span>
      )}
    </button>
  )
}
