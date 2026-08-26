import type { Metadata } from "next"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Conoce cómo Alpha Trainer recopila, usa y protege tus datos personales.",
  alternates: { canonical: `${siteConfig.url}/privacidad` },
}

export default function PrivacidadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Política de Privacidad
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Última actualización: agosto de 2026
            </p>
          </div>

          <div className="flex flex-col gap-10 text-sm leading-7 text-foreground/90">
            <section>
              <p>
                Alpha Trainer (&ldquo;nosotros&rdquo;, &ldquo;nos&rdquo;) es una aplicación web de
                entrenamiento personal disponible en{" "}
                <strong>alphatrainer.net</strong>. Esta política explica qué
                datos recopilamos, para qué los usamos y cuáles son tus
                derechos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">1. Datos que recopilamos</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="font-semibold mb-1">Datos de cuenta</h3>
                  <p className="text-muted-foreground">
                    Nombre, nombre de usuario, dirección de correo electrónico y
                    contraseña (almacenada en forma de hash; nunca en texto
                    plano). Estos datos son necesarios para crear y gestionar tu
                    cuenta.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Perfil de entrenamiento</h3>
                  <p className="text-muted-foreground">
                    Edad, sexo, peso, altura, nivel de experiencia, objetivo de
                    entrenamiento y días disponibles por semana. Estos datos se
                    usan para personalizar tus rutinas.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Entorno y equipo</h3>
                  <p className="text-muted-foreground">
                    Preferencia de entorno (gimnasio, casa o ambos) y equipo
                    disponible. Se usan para adaptar los ejercicios sugeridos.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Datos de entrenamiento</h3>
                  <p className="text-muted-foreground">
                    Rutinas creadas, sesiones de entrenamiento, ejercicios
                    realizados, series, repeticiones, peso utilizado, descansos y
                    notas personales.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Mediciones de progreso</h3>
                  <p className="text-muted-foreground">
                    Mediciones corporales opcionales que registres: peso, grasa
                    corporal, cintura, pecho, brazo y muslo.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Datos de uso (analytics)</h3>
                  <p className="text-muted-foreground">
                    Eventos de producto internos: qué funciones usas y cuándo
                    (por ejemplo, rutina iniciada, ejercicio visualizado). Estos
                    eventos no contienen contraseñas, tokens de autenticación ni
                    datos sensibles identificables más allá de un identificador
                    interno de usuario.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">2. Finalidad del tratamiento</h2>
              <ul className="flex flex-col gap-2 list-disc list-inside text-muted-foreground">
                <li>Proveer y personalizar el servicio de entrenamiento.</li>
                <li>Generar rutinas adaptadas a tu perfil y objetivo.</li>
                <li>Mostrarte tu historial de progreso y sesiones.</li>
                <li>Enviarte correos transaccionales (verificación de cuenta, recuperación de contraseña).</li>
                <li>Mejorar el producto mediante análisis de uso agregado.</li>
                <li>Gestionar tu cuenta y suscripción.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">3. Proveedores de servicio</h2>
              <p className="text-muted-foreground mb-3">
                Para operar, compartimos datos con los siguientes proveedores
                técnicos. Estos actúan como procesadores de datos y no venden
                tu información:
              </p>
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="font-semibold">Supabase</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Autenticación, base de datos y almacenamiento de archivos.
                    Tus datos se almacenan en servidores administrados por
                    Supabase (infraestructura en AWS).
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="font-semibold">Vercel</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Alojamiento y distribución de la aplicación web.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="font-semibold">Groq (modelo de IA)</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Utilizado para la generación de rutinas con IA. Ver sección
                    4.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="font-semibold">Resend (correo transaccional)</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Servicio de envío de correos de verificación y recuperación
                    de contraseña. Tu dirección de correo se transmite únicamente
                    para entregar estos mensajes.
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mt-3">
                No vendemos tus datos personales a terceros ni los compartimos
                con fines publicitarios externos.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">4. Inteligencia artificial</h2>
              <p className="text-muted-foreground mb-2">
                Cuando usas la función de generación de rutinas con IA, enviamos
                a Groq los siguientes parámetros de entrenamiento: objetivo,
                nivel de experiencia, días por semana, entorno y equipo
                disponible.
              </p>
              <p className="text-muted-foreground">
                No enviamos a ningún modelo de IA externo tu nombre, correo
                electrónico, nombre de usuario ni datos de salud como peso o
                medidas corporales. La IA recibe únicamente los parámetros
                necesarios para construir una rutina coherente.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">5. Seguridad</h2>
              <p className="text-muted-foreground">
                Utilizamos HTTPS, autenticación basada en tokens gestionados por
                Supabase, controles de acceso por fila (Row Level Security) y
                separación de privilegios entre cliente y servidor. Las
                contraseñas se almacenan en forma de hash con bcrypt. Para más
                detalles, consulta nuestra{" "}
                <a
                  href="/seguridad"
                  className="text-primary hover:underline"
                >
                  página de seguridad
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">6. Conservación de datos</h2>
              <p className="text-muted-foreground">
                Conservamos tus datos mientras tu cuenta esté activa o mientras
                sea necesario para prestarte el servicio. Al eliminar tu cuenta,
                tus datos personales (perfil, rutinas, sesiones, progreso) se
                eliminan de forma permanente. Los eventos de analytics quedan
                anonimizados (sin identificador de usuario).
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">7. Tus derechos</h2>
              <p className="text-muted-foreground mb-2">
                Dependiendo de tu jurisdicción, puedes tener los siguientes
                derechos sobre tus datos:
              </p>
              <ul className="flex flex-col gap-1 list-disc list-inside text-muted-foreground">
                <li>Acceso a los datos que tenemos sobre ti.</li>
                <li>Rectificación de datos incorrectos o incompletos.</li>
                <li>Eliminación de tu cuenta y datos asociados.</li>
                <li>Portabilidad de tus datos en formato estructurado.</li>
                <li>Oposición al tratamiento para determinadas finalidades.</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Para ejercer cualquiera de estos derechos, escríbenos a{" "}
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="text-primary hover:underline"
                >
                  {siteConfig.contact.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">8. Eliminación de cuenta</h2>
              <p className="text-muted-foreground">
                Puedes eliminar tu cuenta en cualquier momento desde tu perfil
                (Ajustes → Zona de peligro) o siguiendo las instrucciones en{" "}
                <a href="/eliminar-cuenta" className="text-primary hover:underline">
                  alphatrainer.net/eliminar-cuenta
                </a>
                . La eliminación es permanente e irreversible.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">9. Cambios a esta política</h2>
              <p className="text-muted-foreground">
                Podemos actualizar esta política ocasionalmente. Si realizamos
                cambios significativos, te lo comunicaremos por correo
                electrónico o mediante un aviso en la aplicación antes de que
                entren en vigor. La fecha de la última actualización siempre
                aparece en la parte superior.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-3">10. Contacto</h2>
              <p className="text-muted-foreground">
                Si tienes preguntas sobre esta política o sobre el tratamiento
                de tus datos, escríbenos a{" "}
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
