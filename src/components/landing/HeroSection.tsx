import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GymLogo } from "@/components/layout/GymLogo"
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
          <div className="mb-8">
            <GymLogo size="lg" className="justify-center brightness-0 invert" />
          </div>

          <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-secondary-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            <span className="text-primary">FITNESS CLUB:</span> {siteConfig.institutional.heroTitle}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-secondary-foreground/75">
            {siteConfig.institutional.heroSubtitle}
          </p>

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
                className="gap-2 border-white/30 px-8 text-base text-secondary-foreground hover:bg-white/10"
              >
                {siteConfig.institutional.ctaSecondary}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-16 w-full max-w-3xl">
            <div className="grid grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              {[
                { value: "+500", label: "Socios activos", emoji: "💪" },
                { value: "100%", label: "Rutinas personalizadas", emoji: "🎯" },
                { value: "7 días", label: "Acompañamiento", emoji: "📞" },
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
