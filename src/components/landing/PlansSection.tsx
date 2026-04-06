import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { mockPlanes } from "@/data/mock-data"

export function PlansSection() {
  return (
    <section id="planes" className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">Precios</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Planes para cada objetivo</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Empieza gratis y escala cuando estés listo. Sin compromisos, sin contratos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 items-start">
          {mockPlanes.map((plan) => (
            <div
              key={plan.id}
              className={cn("relative", plan.destacado && "md:-mt-4")}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="px-4 py-1 text-xs font-semibold shadow-sm">{plan.badge}</Badge>
                </div>
              )}
              <Card
                className={cn(
                  "flex flex-col",
                  plan.destacado && "ring-2 ring-primary shadow-lg shadow-primary/10"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{plan.nombre}</CardTitle>
                  <CardDescription className="text-sm">{plan.descripcion}</CardDescription>
                  <div className="mt-4 flex items-baseline gap-1">
                    {plan.precio === 0 ? (
                      <span className="text-4xl font-bold">Gratis</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">{plan.precio}€</span>
                        <span className="text-sm text-muted-foreground">/{plan.periodo}</span>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="flex flex-col gap-3">
                    {plan.caracteristicas.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Link href="/register" className="w-full">
                    <Button
                      className="w-full"
                      variant={plan.destacado ? "default" : "outline"}
                    >
                      {plan.precio === 0 ? "Comenzar gratis" : `Elegir ${plan.nombre}`}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
