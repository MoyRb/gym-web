/**
 * BrandBackground — editorial brand watermark using the Alpha Trainer white wordmark SVG.
 *
 * Variants:
 *   hero   — oversized, centered, slow ambient motion, opacity 0.10,
 *            radial mask fade, 0.5px blur — landing hero
 *   auth   — large, bottom-right, static, opacity 0.06 — login / register
 *   app    — oversized, bottom-right, very subtle, static, opacity 0.028 — dashboard
 *
 * Always: aria-hidden, pointer-events-none, select-none, no layout shift, no repeat.
 */

import type { CSSProperties } from "react"

const LOGO_SRC = "/brand/alpha-trainer/logo-wordmark-light.svg"

interface VariantConfig {
  opacity: number
  animated: boolean
  imgClass: string
  imgStyle: CSSProperties
}

const VARIANTS: Record<"hero" | "auth" | "app", VariantConfig> = {
  /**
   * hero — the editorial flagship treatment.
   * Logo is enormous, centered, softly masked at the edges so it dissolves
   * into the background rather than having a hard crop. Very slow ambient
   * float (CSS keyframe, ~26s) keeps it alive without being distracting.
   */
  hero: {
    opacity: 0.10,
    animated: true,
    imgClass: [
      "absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2",
      "w-[130vw] sm:w-[78vw] lg:w-[72vw]",
      "max-w-none h-auto",
    ].join(" "),
    imgStyle: {
      maskImage:
        "radial-gradient(ellipse 82% 68% at 50% 50%, black 12%, transparent 70%)",
      WebkitMaskImage:
        "radial-gradient(ellipse 82% 68% at 50% 50%, black 12%, transparent 70%)",
      filter: "blur(0.5px)",
    },
  },

  /**
   * auth — login / register.
   * Anchored bottom-right, slight tilt. Softer opacity, no motion — the form
   * must stay the visual focus.
   */
  auth: {
    opacity: 0.06,
    animated: false,
    imgClass: [
      "absolute bottom-[-18%] right-[-14%]",
      "w-[110vw] sm:w-[62vw]",
      "max-w-none h-auto",
      "rotate-[-6deg]",
    ].join(" "),
    imgStyle: {
      maskImage:
        "radial-gradient(ellipse 70% 60% at 70% 70%, black 20%, transparent 75%)",
      WebkitMaskImage:
        "radial-gradient(ellipse 70% 60% at 70% 70%, black 20%, transparent 75%)",
    },
  },

  /**
   * app — internal dashboard.
   * Barely perceptible — must never compete with cards, inputs, or charts.
   * Static, bottom-right corner, slightly outside the viewport.
   */
  app: {
    opacity: 0.028,
    animated: false,
    imgClass: [
      "absolute bottom-[-10%] right-[-8%]",
      "w-[70vw]",
      "max-w-none h-auto",
      "rotate-[-5deg]",
    ].join(" "),
    imgStyle: {},
  },
}

export interface BrandBackgroundProps {
  variant?: keyof typeof VARIANTS
}

export function BrandBackground({ variant = "app" }: BrandBackgroundProps) {
  const cfg = VARIANTS[variant]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt=""
        draggable={false}
        className={cfg.animated ? `${cfg.imgClass} animate-brand-float` : cfg.imgClass}
        style={{ opacity: cfg.opacity, ...cfg.imgStyle }}
      />
    </div>
  )
}
