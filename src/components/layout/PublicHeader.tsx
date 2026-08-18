"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { siteConfig } from "@/config/site"

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <AlphaTrainerLogo href="/" variant="auto" height={26} />

        <nav className="hidden items-center gap-8 md:flex">
          {siteConfig.navigation.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-sm">
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/register">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
            >
              {siteConfig.institutional.ctaPrimary}
            </Button>
          </Link>
        </div>

        <button
          className="flex items-center justify-center rounded p-2 text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {siteConfig.navigation.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full" size="sm">
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="sm">
                  {siteConfig.institutional.ctaPrimary}
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
