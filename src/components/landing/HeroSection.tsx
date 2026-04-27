import Link from "next/link"
import { ArrowRight, ChevronRight, Clock3, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/layout/BrandMark"
import { siteConfig } from "@/config/site"

export function HeroSection() {
  return (
    <section id="inicio" className="relative overflow-hidden bg-secondary">
      <div className="absolute inset-0 -z-0">
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-primary/5 blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="flex flex-col items-center text-center text-secondary-foreground">
          <div className="mb-8 rounded-2xl border border-white/15 bg-white/90 px-5 py-3 shadow-lg">
            <BrandMark href={undefined} variant="hero" />
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-secondary-foreground sm:text-5xl lg:text-6xl">
            {siteConfig.institutional.heroTitle}
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-secondary-foreground/80">
            {siteConfig.institutional.heroSubtitle}
          </p>

          <div className="mt-6 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p className="mb-1 flex items-center gap-2 font-semibold text-primary"><MapPin className="h-4 w-4" />Ubicación</p>
              <p className="text-secondary-foreground/75">{siteConfig.contact.address}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p className="mb-1 flex items-center gap-2 font-semibold text-primary"><Clock3 className="h-4 w-4" />Horario</p>
              <p className="text-secondary-foreground/75">{siteConfig.contact.hours[0].time}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p className="mb-1 flex items-center gap-2 font-semibold text-primary"><Phone className="h-4 w-4" />Contacto</p>
              <p className="text-secondary-foreground/75">{siteConfig.contact.phone}</p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2 bg-primary px-8 text-base hover:bg-primary/90">
                {siteConfig.institutional.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-white/70 bg-white px-8 text-base text-slate-800 shadow-sm hover:bg-white/90 hover:text-slate-900"
              >
                {siteConfig.institutional.ctaSecondary}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
