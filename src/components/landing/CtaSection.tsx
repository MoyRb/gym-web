import Link from "next/link"
import { ArrowRight, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"

export function CtaSection() {
  return (
    <section className="py-20 sm:py-28 bg-primary">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black tracking-tight text-primary-foreground sm:text-4xl">
          ¿Listo para empezar?
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80 max-w-xl mx-auto">
          Únete a {siteConfig.name} y accede a tu plan personalizado. Regístrate y obtén tu rutina inicial en minutos.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row justify-center">
          <Link href="/register">
            <Button
              size="lg"
              className="gap-2 px-8 text-base bg-white text-primary hover:bg-white/90"
            >
              Crear mi cuenta
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="lg"
              variant="outline"
              className="gap-2 px-8 text-base border-white/40 text-primary-foreground hover:bg-white/10"
            >
              <LogIn className="h-4 w-4" />
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
