import Link from "next/link"
import { ArrowRight, TrendingUp, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandBackground } from "@/components/layout/BrandBackground"
import { siteConfig } from "@/config/site"

const PREVIEW_EXERCISES = [
  { name: "Press de Banca", sets: "4×8", done: true },
  { name: "Remo con Barra", sets: "4×8", done: true },
  { name: "Press Militar", sets: "3×10", done: false },
  { name: "Curl de Bíceps", sets: "3×12", done: false },
] as const

export function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-background"
    >
      {/* ── Red ambient glows — environmental light, not a gradient ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Upper right warm source */}
        <div className="absolute right-[-8%] top-[-18%] h-[55vh] w-[45vw] rounded-full bg-primary/[0.07] blur-[110px]" />
        {/* Mid-left secondary */}
        <div className="absolute left-[-5%] top-[35%] h-[35vh] w-[28vw] rounded-full bg-primary/[0.04] blur-[90px]" />
      </div>

      {/* ── Brand watermark — hero: large, centered, animated ── */}
      <BrandBackground variant="hero" />

      {/* ── Content — above both background layers ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Headline block */}
        <div className="flex flex-col items-center pt-20 pb-12 text-center sm:pt-28 sm:pb-14">

          {/* Eyebrow pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.07] px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              IA · Entrenamiento · Progreso
            </span>
          </div>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.75rem] lg:leading-[1.08]">
            {siteConfig.institutional.heroTitle}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {siteConfig.institutional.heroSubtitle}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button
                size="lg"
                className="gap-2 bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90"
              >
                {siteConfig.institutional.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="px-8 text-base">
                {siteConfig.institutional.ctaSecondary}
              </Button>
            </a>
          </div>

          <p className="mt-6 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
            Sin tarjeta de crédito · Gratis para siempre
          </p>
        </div>

        {/* ── Product preview — peeks below the fold ── */}
        <div className="relative">
          {/* Fade mask — editorial cut at fold, content bleeds into next section */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-t from-background via-background/80 to-transparent"
          />

          {/* Dashboard card mockup */}
          <div
            className="mx-auto max-w-2xl overflow-hidden rounded-t-lg border border-border/50 bg-card shadow-[0_-2px_48px_rgba(0,0,0,0.28)]"
            style={{
              transform: "perspective(1400px) rotateX(3deg)",
              transformOrigin: "top center",
            }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Entrenamiento de hoy
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <TrendingUp className="h-3 w-3" />
                <span className="tabular">Semana 1 · Día 3</span>
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4">
              <p className="mb-3.5 text-sm font-bold">Fuerza — Tren Superior A</p>

              <div className="flex flex-col gap-2.5">
                {PREVIEW_EXERCISES.map((ex, i) => (
                  <div
                    key={ex.name}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          ex.done
                            ? "bg-primary/20 text-primary"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {ex.done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                      </span>
                      <span
                        className={`truncate font-medium ${
                          ex.done
                            ? "text-muted-foreground/40 line-through decoration-primary/30"
                            : ""
                        }`}
                      >
                        {ex.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular">
                      {ex.sets}
                    </span>
                  </div>
                ))}
              </div>

              {/* Session progress bar */}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/2 rounded-full bg-primary" />
                </div>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  2 / 4
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
