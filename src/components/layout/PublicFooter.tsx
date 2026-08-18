import Link from "next/link"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { siteConfig } from "@/config/site"

const footerLinks = {
  producto: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Ejercicios", href: "/dashboard/exercises" },
    { label: "Mi plan", href: "/dashboard/rutina" },
    { label: "Progreso", href: "/dashboard/progress" },
  ],
  cuenta: [
    { label: "Crear cuenta", href: "/register" },
    { label: "Iniciar sesión", href: "/login" },
  ],
  legal: [
    { label: "Privacidad", href: "#" },
    { label: "Términos", href: "#" },
  ],
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 flex flex-col gap-4 sm:col-span-1">
            <AlphaTrainerLogo variant="auto" height={24} />
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
              {siteConfig.slogan}
            </p>
          </div>

          {/* Producto */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Producto
            </h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.producto.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cuenta */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cuenta
            </h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.cuenta.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Legal
            </h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Impulsado por IA
          </p>
        </div>
      </div>
    </footer>
  )
}
