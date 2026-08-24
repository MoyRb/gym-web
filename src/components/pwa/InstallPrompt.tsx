"use client"

import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isStandalone, isIOS, isAndroid } from "@/lib/pwa/install"

type Platform = "ios" | "android" | "desktop" | "unknown"
type InstallState = "idle" | "accepted" | "dismissed"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>("unknown")
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installState, setInstallState] = useState<InstallState>("idle")
  const [standalone, setStandalone] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Detect standalone and platform client-side only
    if (isStandalone()) {
      setStandalone(true)
      return
    }

    if (isIOS()) setPlatform("ios")
    else if (isAndroid()) setPlatform("android")
    else setPlatform("desktop")

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      const evt = e as BeforeInstallPromptEvent
      promptRef.current = evt
      setDeferredPrompt(evt)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
  }, [])

  async function handleInstall() {
    const prompt = promptRef.current
    if (!prompt) return

    setIsLoading(true)
    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      setInstallState(outcome === "accepted" ? "accepted" : "dismissed")
      setDeferredPrompt(null)
      promptRef.current = null
    } catch {
      // Prompt can fail silently — not a critical error
    } finally {
      setIsLoading(false)
    }
  }

  // Already installed — nothing to show
  if (standalone) return null
  // Already acted on
  if (installState === "accepted") return null

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-1 text-sm font-semibold">Instalar Alpha Trainer</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Accede más rápido desde tu pantalla de inicio, sin abrir el navegador.
      </p>

      {/* iOS — manual instructions (no API available) */}
      {platform === "ios" && (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Abre Alpha Trainer en <strong className="text-foreground">Safari</strong>, toca el botón{" "}
            <strong className="text-foreground">Compartir</strong> y elige{" "}
            <strong className="text-foreground">Agregar a Inicio</strong>.
          </p>
        </div>
      )}

      {/* Android — beforeinstallprompt button */}
      {platform === "android" && deferredPrompt && installState === "idle" && (
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={handleInstall}
          disabled={isLoading}
          aria-label="Instalar Alpha Trainer como app"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {isLoading ? "Instalando..." : "Instalar app"}
        </Button>
      )}

      {/* Android — no prompt captured yet (already dismissed or not eligible) */}
      {platform === "android" && !deferredPrompt && installState === "idle" && (
        <p className="text-xs text-muted-foreground">
          Usa el menú de Chrome (⋮) y elige{" "}
          <strong className="text-foreground">Añadir a pantalla de inicio</strong>.
        </p>
      )}

      {/* Desktop Chrome/Edge */}
      {platform === "desktop" && deferredPrompt && installState === "idle" && (
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={handleInstall}
          disabled={isLoading}
          aria-label="Instalar Alpha Trainer como app"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {isLoading ? "Instalando..." : "Instalar app"}
        </Button>
      )}

      {/* Desktop — no prompt captured */}
      {platform === "desktop" && !deferredPrompt && installState === "idle" && (
        <p className="text-xs text-muted-foreground">
          En Chrome o Edge, busca el icono de instalación en la barra de direcciones.
        </p>
      )}

      {/* Dismissed */}
      {installState === "dismissed" && (
        <p className="text-xs text-muted-foreground">
          Puedes instalarla desde el menú del navegador cuando quieras.
        </p>
      )}
    </div>
  )
}
