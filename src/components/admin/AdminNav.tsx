"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/dashboard/admin",           label: "Overview"    },
  { href: "/dashboard/admin/training",  label: "Training"    },
  { href: "/dashboard/admin/equipment", label: "Equipment"   },
  { href: "/dashboard/admin/ai",        label: "AI"          },
  { href: "/dashboard/admin/users",     label: "Users"       },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0.5 border-b border-border pb-0 -mb-px overflow-x-auto">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = href === "/dashboard/admin"
          ? pathname === href
          : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
