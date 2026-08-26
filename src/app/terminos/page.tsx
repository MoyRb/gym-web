import type { Metadata } from "next"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "Términos de Servicio",
  description:
    "Términos y condiciones de uso de Alpha Trainer. Conoce tus derechos y responsabilidades.",
  alternates: { canonical: `${siteConfig.url}/terminos` },
}

export default function TerminosPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Términos de Servicio
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Última actualización: agosto de 2026
            </p>
          </div>

          <div className="flex flex-col gap-10 text-sm leading-7 text-foreground/90">
            <section>
              <p>
                Al acceder o utilizar Alpha Trainer (&ldquo;el Servicio&rdquo;,
                &ldquo;la Aplicación&rdquo;), aceptas quedar vinculado por estos
                Términos de Servicio. Si no estás de acuerdo, no utilices el
                Servicio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">1. El servicio</h2>
              <p className="text-muted-foreground">
                Alpha Trainer es una aplicación web de entrenamiento personal
                que ofrece rutinas manuales e impulsadas por inteligencia
                artificial, seguimiento de sesiones, catálogo de ejercicios y
                herramientas de progreso. El Servicio está disponible en{" "}
                <strong>alphatrainer.net</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">2. Cuentas de usuario</h2>
              <div className="flex flex-col gap-3 text-muted-foreground">
                <p>
                  Para usar la mayoría de las funciones debes crear una cuenta.
                  Eres responsable de mantener la confidencialidad de tus
                  credenciales y de todas las actividades realizadas desde tu
                  cuenta.
                </p>
                <p>
                  Debes proporcionar información precisa durante el registro.
                  Está prohibido crear cuentas con identidades falsas o hacerse
                  pasar por otra persona.
                </p>
                <p>
                  Debes tener al menos 14 años para usar Alpha Trainer. Si eres
                  menor de edad, debes contar con el consentimiento de un tutor
                  legal.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">3. Uso aceptable</h2>
              <p className="text-muted-foreground mb-2">No está permitido:</p>
              <ul className="flex flex-col gap-1 list-disc list-inside text-muted-foreground">
                <li>Usar el Servicio para actividades ilegales.</li>
                <li>Intentar acceder sin autorización a sistemas, cuentas o datos de otros usuarios.</li>
                <li>Interferir con el funcionamiento del Servicio o sus servidores.</li>
                <li>Realizar ingeniería inversa de partes propietarias del Servicio.</li>
                <li>Automatizar el acceso sin autorización expresa (bots, scrapers).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">4. Uso de inteligencia artificial</h2>
              <p className="text-muted-foreground">
                Algunas funciones de Alpha Trainer utilizan modelos de
                inteligencia artificial para generar rutinas de entrenamiento.
                Las sugerencias generadas por IA son orientativas y pueden no
                ser apropiadas para todas las personas, condiciones físicas o
                niveles de experiencia. Siempre debes ejercer tu propio juicio
                antes de seguir cualquier rutina.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">5. Aviso de salud</h2>
              <p className="text-muted-foreground">
                Alpha Trainer es una herramienta de apoyo al entrenamiento
                personal y <strong>no sustituye el consejo, diagnóstico o
                tratamiento médico profesional</strong>. Si tienes alguna
                condición de salud, lesión o dudas sobre si un programa de
                ejercicios es adecuado para ti, consulta con un profesional de
                la salud antes de comenzar.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">6. Disponibilidad del servicio</h2>
              <p className="text-muted-foreground">
                Nos esforzamos por mantener el Servicio disponible, pero no
                garantizamos una disponibilidad ininterrumpida. Podemos realizar
                mantenimientos, actualizaciones o interrupciones temporales sin
                previo aviso. No somos responsables de pérdidas derivadas de
                interrupciones del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">7. Planes y suscripciones</h2>
              <p className="text-muted-foreground">
                Alpha Trainer ofrece actualmente un plan gratuito con acceso a
                las funciones principales. En el futuro se introducirá un plan
                de pago (Pro) con funciones adicionales. Cuando el plan Pro esté
                disponible, publicaremos los términos de facturación, renovación
                y cancelación correspondientes. Nada en estos Términos
                constituye una oferta de compra del plan Pro hasta que el
                proceso de pago esté activo.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">8. Propiedad intelectual</h2>
              <p className="text-muted-foreground">
                El código, diseño, marcas, logos y contenido de Alpha Trainer
                son propiedad de sus creadores y están protegidos por las leyes
                aplicables de propiedad intelectual. No puedes reproducir,
                distribuir ni crear obras derivadas sin autorización expresa.
              </p>
              <p className="text-muted-foreground mt-2">
                El catálogo de ejercicios incluye materiales visuales (GIFs) de
                GymVisual licenciados para su uso dentro de la aplicación.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">9. Limitación de responsabilidad</h2>
              <p className="text-muted-foreground">
                En la medida permitida por la ley, Alpha Trainer no será
                responsable de daños indirectos, incidentales, especiales o
                consecuentes derivados del uso o la imposibilidad de uso del
                Servicio, incluidas lesiones físicas resultantes del ejercicio.
                El usuario asume la responsabilidad de verificar que cualquier
                actividad física sea adecuada para su condición.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">10. Suspensión y terminación</h2>
              <p className="text-muted-foreground">
                Podemos suspender o eliminar cuentas que violen estos Términos,
                con o sin previo aviso dependiendo de la gravedad. Tú puedes
                eliminar tu cuenta en cualquier momento desde la configuración de
                tu perfil.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">11. Cambios a estos términos</h2>
              <p className="text-muted-foreground">
                Podemos actualizar estos Términos. Si los cambios son
                significativos, te notificaremos por correo o mediante un aviso
                en la aplicación antes de que entren en vigor. El uso continuado
                del Servicio después de la fecha de entrada en vigor constituye
                aceptación de los nuevos Términos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">12. Contacto</h2>
              <p className="text-muted-foreground">
                Para preguntas sobre estos Términos, escríbenos a{" "}
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-primary hover:underline"
                >
                  {siteConfig.contact.email}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
