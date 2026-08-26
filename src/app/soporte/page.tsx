import type { Metadata } from "next"
import { Mail, KeyRound, Dumbbell, BarChart3, HelpCircle } from "lucide-react"
import Link from "next/link"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "Soporte",
  description:
    "Centro de ayuda de Alpha Trainer. Resuelve dudas sobre tu cuenta, rutinas, entrenamiento y más.",
  alternates: { canonical: `${siteConfig.url}/soporte` },
}

const topics = [
  {
    icon: KeyRound,
    title: "Acceso a tu cuenta",
    items: [
      {
        q: "Olvidé mi contraseña",
        a: (
          <>
            Ve a{" "}
            <Link href="/forgot-password" className="text-primary hover:underline">
              Recuperar contraseña
            </Link>{" "}
            e ingresa tu correo. Recibirás un enlace para crear una nueva
            contraseña.
          </>
        ),
      },
      {
        q: "No recibí el correo de verificación",
        a: (
          <>
            Revisa tu carpeta de spam. Si no está ahí, ve a{" "}
            <Link href="/verify-email" className="text-primary hover:underline">
              Verificar correo
            </Link>{" "}
            y solicita un nuevo enlace. Espera al menos 60 segundos entre
            intentos.
          </>
        ),
      },
      {
        q: "Quiero cambiar mi contraseña",
        a: (
          <>
            Desde tu perfil, en la sección{" "}
            <strong>Seguridad de la cuenta</strong>, encontrarás el enlace para
            cambiar tu contraseña.
          </>
        ),
      },
    ],
  },
  {
    icon: Dumbbell,
    title: "Rutinas y entrenamiento",
    items: [
      {
        q: "¿Cómo creo una rutina?",
        a: "Puedes crear una rutina manualmente desde Dashboard → Mi plan → Nueva rutina, o usar la generación con IA si tienes generaciones disponibles en tu plan.",
      },
      {
        q: "¿Cuándo se renueva mi cuota de IA?",
        a: "La cuota es una ventana deslizante: se renueva 7 días después de tu última generación completada con éxito, no en una fecha fija del mes.",
      },
      {
        q: "¿Las rutinas manuales tienen límite?",
        a: "No. Puedes crear rutinas manuales ilimitadas en todos los planes.",
      },
      {
        q: "Perdí mi sesión de entrenamiento activa",
        a: "Las sesiones en progreso se recuperan automáticamente. Ve a Dashboard → Mi plan y selecciona el día para continuar.",
      },
    ],
  },
  {
    icon: BarChart3,
    title: "Progreso",
    items: [
      {
        q: "¿Dónde veo mi historial de entrenamientos?",
        a: "En Dashboard → Progreso. Allí encontrarás el historial de sesiones y mediciones.",
      },
      {
        q: "¿Puedo registrar medidas corporales?",
        a: "Sí. Desde la sección de Progreso puedes agregar mediciones de peso, circunferencias y más.",
      },
    ],
  },
]

export default function SoportePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight">Soporte</h1>
            <p className="mt-3 text-muted-foreground">
              Encuentra respuestas a las dudas más comunes o escríbenos
              directamente.
            </p>
          </div>

          {/* Topic sections */}
          <div className="flex flex-col gap-10 mb-12">
            {topics.map((topic) => {
              const Icon = topic.icon
              return (
                <section key={topic.title}>
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <h2 className="text-base font-bold">{topic.title}</h2>
                  </div>
                  <div className="flex flex-col gap-4">
                    {topic.items.map((item) => (
                      <div
                        key={item.q}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <p className="text-sm font-semibold mb-1">{item.q}</p>
                        <p className="text-sm text-muted-foreground leading-6">
                          {item.a}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Contact CTA */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-3 mb-3">
              <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-bold">¿No encontraste tu respuesta?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escríbenos directamente y te responderemos lo antes posible.
                </p>
              </div>
            </div>
            <a
              href={`mailto:${siteConfig.contact.email}?subject=Soporte%20Alpha%20Trainer`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Mail className="h-4 w-4" />
              {siteConfig.contact.email}
            </a>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
