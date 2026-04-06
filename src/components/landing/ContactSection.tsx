import Link from "next/link"
import { MapPin, Phone, Mail, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { siteConfig } from "@/config/site"

export function ContactSection() {
  return (
    <section id="contacto" className="py-20 sm:py-28 bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
          {/* Left: text + CTA */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Encuéntranos</p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-secondary-foreground">
                Ven a entrenar con nosotros
              </h2>
            </div>
            <p className="text-secondary-foreground/70 leading-relaxed">
              Visítanos en el gimnasio, llámanos o escríbenos. Estamos aquí para ayudarte a dar el primer paso.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-secondary-foreground/50 font-medium uppercase tracking-wide">Teléfono</p>
                  <p className="font-medium">{siteConfig.contact.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-secondary-foreground/50 font-medium uppercase tracking-wide">Email</p>
                  <p className="font-medium">{siteConfig.contact.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-secondary-foreground/50 font-medium uppercase tracking-wide">Dirección</p>
                  <p className="font-medium">{siteConfig.contact.address}</p>
                  <Link href={siteConfig.contact.googleMapsUrl} className="text-xs text-primary hover:underline mt-0.5 inline-block">
                    Ver en el mapa →
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button className="gap-2">
                  Registrarme ahora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="gap-2 border-white/20 text-secondary-foreground hover:bg-white/10">
                  Acceder a mi cuenta
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: hours card */}
          <Card className="bg-white/5 border-white/10 text-secondary-foreground">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Horarios de apertura</h3>
              </div>
              <div className="flex flex-col gap-4">
                {siteConfig.contact.hours.map((h, i) => (
                  <div
                    key={h.days}
                    className={`flex items-center justify-between py-3 ${
                      i < siteConfig.contact.hours.length - 1
                        ? "border-b border-white/10"
                        : ""
                    }`}
                  >
                    <span className="font-medium text-sm">{h.days}</span>
                    <span className="text-sm text-primary font-semibold">{h.time}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm text-secondary-foreground/80 text-center">
                  ¿Tienes dudas?{" "}
                  <a href={`mailto:${siteConfig.contact.email}`} className="text-primary font-semibold hover:underline">
                    Escríbenos
                  </a>{" "}
                  y te respondemos en menos de 24h.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
