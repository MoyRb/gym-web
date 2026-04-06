import Link from "next/link"
import { MapPin, Phone, Mail, Clock } from "lucide-react"
import { GymLogo } from "@/components/layout/GymLogo"
import { siteConfig } from "@/lib/site-config"

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <GymLogo className="brightness-0 invert" />
            <p className="text-sm text-secondary-foreground/70 leading-relaxed">
              Tu gimnasio de confianza. Entrenamiento personalizado, comunidad y resultados reales.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-secondary-foreground">Menú</h3>
            <ul className="flex flex-col gap-2">
              {siteConfig.navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="mb-4 text-sm font-semibold flex items-center gap-2 text-secondary-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Horarios
            </h3>
            <ul className="flex flex-col gap-2">
              {siteConfig.contact.hours.map((h) => (
                <li key={h.days} className="text-sm text-secondary-foreground/70">
                  <span className="font-medium text-secondary-foreground">{h.days}</span>
                  <br />
                  {h.time}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-secondary-foreground">Contacto</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-2 text-sm text-secondary-foreground/70">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                {siteConfig.contact.phone}
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary-foreground/70">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                {siteConfig.contact.email}
              </li>
              <li className="flex items-start gap-2 text-sm text-secondary-foreground/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {siteConfig.contact.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-secondary-foreground/50">
            © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-secondary-foreground/50 hover:text-primary transition-colors">
              Privacidad
            </Link>
            <Link href="#" className="text-xs text-secondary-foreground/50 hover:text-primary transition-colors">
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
