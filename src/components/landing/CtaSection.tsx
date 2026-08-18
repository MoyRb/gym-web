import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Tu mejor versión empieza hoy.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">
          Crea tu cuenta, completa tu perfil y deja que la IA construya tu plan de entrenamiento.
          Sin costo. Sin tarjeta de crédito.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="gap-2 bg-primary px-8 text-base text-primary-foreground hover:bg-primary/90"
            >
              Comenzar gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="px-8 text-base">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
