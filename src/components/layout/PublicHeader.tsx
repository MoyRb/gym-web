"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/layout/BrandMark"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { siteConfig } from "@/config/site"

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandMark variant="header" className="text-lg sm:text-xl" />

        <nav className="hidden items-center gap-6 md:flex">
          {siteConfig.navigation.map((link) => (
            <Link
              key={link.href}
              href={`/${link.href}`}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle className="w-auto px-2.5 py-1.5" />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Crear cuenta</Button>
          </Link>
        </div>

        <button
          className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menú"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {siteConfig.navigation.map((link) => (
              <Link
                key={link.href}
                href={`/${link.href}`}
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <ThemeToggle />
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full" size="sm">
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <Button className="w-full" size="sm">
                  Crear cuenta
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
