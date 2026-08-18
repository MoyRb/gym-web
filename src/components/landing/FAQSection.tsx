"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const faqs = [
  {
    question: "¿Necesito experiencia previa en el gimnasio?",
    answer:
      "No. Alpha Trainer adapta el plan a tu nivel. Si eres principiante, recibirás una rutina con ejercicios apropiados, volumen controlado y progresión gradual. El sistema tiene opciones desde principiante hasta avanzado.",
  },
  {
    question: "¿Cómo genera la IA mi rutina?",
    answer:
      "La IA selecciona ejercicios basándose en tu objetivo (masa muscular, pérdida de grasa, resistencia o condición general), tu nivel de experiencia y los días que puedes entrenar por semana. Los parámetros de series, repeticiones y descanso se calculan de forma determinista a partir de tablas de prescripción.",
  },
  {
    question: "¿Puedo usar Alpha Trainer sin ir al gimnasio?",
    answer:
      "Sí. El catálogo incluye ejercicios de peso corporal, con bandas, mancuernas y otras opciones que no requieren equipamiento de gimnasio completo. Al generar tu plan puedes ajustar el equipamiento disponible.",
  },
  {
    question: "¿Está disponible en móvil?",
    answer:
      "Sí. Alpha Trainer es una aplicación web responsive que funciona en cualquier dispositivo. El modo de entrenamiento activo está diseñado específicamente para usarse con el teléfono durante la sesión.",
  },
  {
    question: "¿Cuánto cuesta?",
    answer:
      "El plan básico es completamente gratuito. Incluye generación de rutina con IA, catálogo de ejercicios con guía visual, registro de sesiones y seguimiento de progreso. Planes avanzados estarán disponibles próximamente.",
  },
  {
    question: "¿Puedo cambiar mi rutina si cambian mis objetivos?",
    answer:
      "Sí. En cualquier momento puedes regenerar tu plan con la IA o solicitar una nueva rutina. Tu historial de sesiones se mantiene independientemente de los cambios en el plan.",
  },
]

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-medium">{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 mt-0.5",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
          {answer}
        </p>
      )}
    </div>
  )
}

export function FAQSection() {
  return (
    <section className="py-20 sm:py-28 bg-card">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Preguntas frecuentes
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Preguntas frecuentes
          </h2>
        </div>

        <div className="rounded-lg border border-border bg-background px-6">
          {faqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  )
}
