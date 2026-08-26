import type { Metadata } from "next"
import { Shield, Lock, Server, Eye, AlertTriangle, Mail } from "lucide-react"
import { PublicHeader } from "@/components/layout/PublicHeader"
import { PublicFooter } from "@/components/layout/PublicFooter"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  title: "Seguridad",
  description:
    "Cómo Alpha Trainer protege tu cuenta y tus datos. Prácticas de seguridad y contacto para reportar vulnerabilidades.",
  alternates: { canonical: `${siteConfig.url}/seguridad` },
}

const practices = [
  {
    icon: Lock,
    title: "Autenticación segura",
    description:
      "Gestionamos la autenticación a través de Supabase Auth. Las contraseñas se almacenan con hash bcrypt. Ofrecemos verificación de correo electrónico y recuperación de contraseña por correo.",
  },
  {
    icon: Server,
    title: "Control de acceso",
    description:
      "Usamos Row Level Security (RLS) en la base de datos: cada usuario solo puede acceder a sus propios datos. Las operaciones privilegiadas se ejecutan exclusivamente desde el servidor.",
  },
  {
    icon: Shield,
    title: "Separación de privilegios",
    description:
      "El cliente nunca recibe credenciales con privilegios elevados. Las operaciones administrativas requieren verificación de rol en el servidor antes de ejecutarse.",
  },
  {
    icon: Eye,
    title: "HTTPS y transporte seguro",
    description:
      "Toda la comunicación entre tu navegador y nuestros servidores se realiza sobre HTTPS con TLS. Aplicamos HSTS para reforzar el uso de conexiones seguras.",
  },
  {
    icon: Server,
    title: "Protección de secretos",
    description:
      "Las claves y credenciales de servicio se almacenan como variables de entorno en el servidor y nunca se exponen al cliente ni al código del navegador.",
  },
  {
    icon: Shield,
    title: "Prácticas de desarrollo",
    description:
      "Aplicamos revisión de código, validación de entradas y principios de mínimo privilegio. Los encabezados HTTP de seguridad están configurados en todas las respuestas.",
  },
]

export default function SeguridadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Seguridad
            </h1>
            <p className="mt-3 text-muted-foreground max-w-lg">
              La seguridad de tu cuenta y tus datos es una prioridad para
              nosotros. Esta página describe nuestras prácticas a alto nivel.
            </p>
          </div>

          {/* Practices grid */}
          <div className="grid gap-6 sm:grid-cols-2 mb-14">
            {practices.map((p) => {
              const Icon = p.icon
              return (
                <div
                  key={p.title}
                  className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <h2 className="text-sm font-semibold">{p.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-6">
                    {p.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Responsible disclosure */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <h2 className="text-base font-bold">
                Reportar una vulnerabilidad
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Si descubriste una vulnerabilidad de seguridad en Alpha Trainer,
              agradecemos que nos lo comuniques de forma responsable antes de
              divulgarla públicamente. Nos comprometemos a responder en un plazo
              razonable y a corregir los problemas reportados.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Envíanos un correo a{" "}
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="text-primary hover:underline font-medium"
              >
                {siteConfig.contact.email}
              </a>{" "}
              con el asunto <strong>&ldquo;Reporte de seguridad&rdquo;</strong>{" "}
              e incluye:
            </p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside text-sm text-muted-foreground mb-5">
              <li>Descripción clara de la vulnerabilidad.</li>
              <li>Pasos para reproducirla.</li>
              <li>Impacto potencial.</li>
              <li>Evidencia (capturas, logs) de forma no destructiva.</li>
            </ul>
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">
                Por favor, NO hagas lo siguiente al investigar:
              </p>
              <ul className="flex flex-col gap-1 list-disc list-inside text-xs text-muted-foreground">
                <li>Acceder a datos de otros usuarios.</li>
                <li>Ejecutar ataques de denegación de servicio (DoS).</li>
                <li>Eliminar o modificar datos que no te pertenecen.</li>
                <li>Explotar la vulnerabilidad más allá de lo necesario para demostrarla.</li>
              </ul>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="text-sm text-primary hover:underline"
              >
                {siteConfig.contact.email}
              </a>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
