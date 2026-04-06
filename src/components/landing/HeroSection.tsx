import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GymLogo } from "@/components/layout/GymLogo"
import { siteConfig } from "@/lib/site-config"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-secondary">
      {/* Background shapes */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-primary/5 blur-2xl" />
        {/* Optional hero image overlay */}
        {/* <img src="/hero-gym.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" /> */}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="flex flex-col items-center text-center text-secondary-foreground">
          {/* Logo */}
          <div className="mb-8">
            <GymLogo size="lg" className="brightness-0 invert justify-center" />
          </div>

          {/* Headline */}
          <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl leading-tight">
            {siteConfig.tagline.split(". ").map((part, i) => (
              <span key={i}>
                {i === 0 ? (
                  <span className="text-primary">{part}.</span>
                ) : (
                  <span className="text-secondary-foreground"> {part}.</span>
                )}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-secondary-foreground/70 leading-relaxed">
            Accede a tus rutinas personalizadas, descarga guías exclusivas y lleva el control de tu progreso — todo en un solo lugar.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-8 text-base bg-primary hover:bg-primary/90">
                Crear mi cuenta gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 px-8 text-base border-white/30 text-secondary-foreground hover:bg-white/10"
              >
                Ya tengo cuenta
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Trust bar */}
          <div className="mt-16 w-full max-w-3xl">
            <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              {[
                { value: "+500", label: "Miembros activos", emoji: "💪" },
                { value: "100%", label: "Rutinas personalizadas", emoji: "🎯" },
                { value: "7 días", label: "Atención y soporte", emoji: "📞" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1 text-center">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-2xl font-black text-primary">{item.value}</span>
                  <span className="text-xs text-secondary-foreground/60">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
