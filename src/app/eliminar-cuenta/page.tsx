import type { Metadata } from "next"
import Link from "next/link"
import { Trash2, ShieldAlert, HelpCircle } from "lucide-react"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "Eliminar cuenta",
  description:
    "Instrucciones para eliminar tu cuenta de Alpha Trainer y qué ocurre con tus datos.",
  alternates: { canonical: `${siteConfig.url}/eliminar-cuenta` },
}

export default function EliminarCuentaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Eliminar tu cuenta
            </h1>
            <p className="mt-3 text-muted-foreground">
              Puedes eliminar tu cuenta de Alpha Trainer en cualquier momento.
              Esta acción es permanente e irreversible.
            </p>
          </div>

          {/* How to delete — in app */}
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">Desde la aplicación</h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <ol className="flex flex-col gap-3 text-sm">
                {[
                  "Inicia sesión en tu cuenta.",
                  "Ve a tu Perfil (ícono de usuario en la barra lateral).",
                  'Desplázate hasta la sección "Zona de peligro" al final de la página.',
                  'Haz clic en "Eliminar cuenta".',
                  'Lee la información y escribe ELIMINAR en el campo de confirmación.',
                  "Confirma la eliminación.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
                >
                  Ir a iniciar sesión
                </Link>
              </div>
            </div>
          </section>

          {/* What gets deleted */}
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">Qué se elimina</h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-2 mb-3">
                <Trash2 className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">
                  Los siguientes datos se eliminan de forma permanente:
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 list-disc list-inside text-sm text-muted-foreground">
                <li>Tu cuenta de autenticación (correo y contraseña).</li>
                <li>Tu perfil (nombre, datos físicos y preferencias).</li>
                <li>Todas tus rutinas de entrenamiento (manuales e IA).</li>
                <li>Historial de sesiones y series registradas.</li>
                <li>Mediciones de progreso corporal.</li>
                <li>Historial de generaciones con IA.</li>
                <li>Información de plan (Free/Pro) si aplica.</li>
              </ul>
            </div>
          </section>

          {/* What remains */}
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">Qué no se elimina</h2>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm font-semibold">Datos anonimizados:</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Los eventos de análisis de producto (como &ldquo;sesión
                iniciada&rdquo; o &ldquo;ejercicio visualizado&rdquo;) quedan en
                la base de datos pero se desvinculan de tu cuenta; el
                identificador de usuario se elimina. Estos datos no te
                identifican.
              </p>
            </div>
          </section>

          {/* Can't log in */}
          <section>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold mb-1">
                    ¿No puedes iniciar sesión?
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    Si no puedes acceder a tu cuenta para eliminarla tú mismo,
                    escríbenos y gestionaremos la eliminación manual.
                  </p>
                  <a
                    href={`mailto:${siteConfig.contact.email}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20cuenta`}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {siteConfig.contact.email}
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
