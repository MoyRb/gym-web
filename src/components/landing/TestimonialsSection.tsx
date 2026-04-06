import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockTestimonios } from "@/data/mock-data"

export function TestimonialsSection() {
  return (
    <section id="testimonios" className="py-20 sm:py-28 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Testimonios</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Lo que dicen nuestros socios</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Personas reales con resultados reales en FITNESS CLUB.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {mockTestimonios.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardContent className="flex flex-col gap-4 pt-6 flex-1">
                <Quote className="h-8 w-8 text-primary/30 shrink-0" />
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  &ldquo;{t.texto}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary shrink-0">
                    {t.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.cargo}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit text-xs">{t.objetivo}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
