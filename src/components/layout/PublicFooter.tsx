import Link from "next/link"
import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { siteConfig, developerConfig } from "@/config/site"

const footerLinks = {
  producto: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Ejercicios", href: "/dashboard/exercises" },
    { label: "Mi plan", href: "/dashboard/rutina" },
    { label: "Progreso", href: "/dashboard/progress" },
    { label: "Precios", href: "/pricing" },
  ],
  cuenta: [
    { label: "Crear cuenta", href: "/register" },
    { label: "Iniciar sesión", href: "/login" },
    { label: "Soporte", href: "/soporte" },
    { label: "Eliminar cuenta", href: "/eliminar-cuenta" },
  ],
  legal: [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Términos", href: "/terminos" },
    { label: "Seguridad", href: "/seguridad" },
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

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 sm:flex-row sm:gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-3">
            <span>
              Desarrollado por{" "}
              {developerConfig.url ? (
                <a
                  href={developerConfig.url}
                  className="hover:text-foreground transition-colors"
                  rel="noopener noreferrer"
                >
                  {developerConfig.name}
                </a>
              ) : (
                <span>{developerConfig.name}</span>
              )}
            </span>
            <span className="text-muted-foreground/40" aria-hidden>·</span>
            <span>Impulsado por IA</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
