import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * variant="light"  — white wordmark, for dark backgrounds (sidebar, dark headers)
 * variant="dark"   — dark wordmark, for light backgrounds
 * variant="accent" — red branded wordmark, for hero/splash contexts
 * variant="auto"   — dark in light mode, light in dark mode (CSS-based, no hydration issue)
 */
export interface AlphaTrainerLogoProps {
  variant?: "light" | "dark" | "accent" | "auto"
  height?: number
  className?: string
  href?: string
}

const LOGO_BASE = "/brand/alpha-trainer"

const srcMap = {
  light: `${LOGO_BASE}/logo-wordmark-light.svg`,
  dark: `${LOGO_BASE}/logo-wordmark-dark.svg`,
  accent: `${LOGO_BASE}/logo-wordmark-accent.svg`,
} as const

export function AlphaTrainerLogo({
  variant = "auto",
  height = 28,
  className,
  href,
}: AlphaTrainerLogoProps) {
  const style = { height: `${height}px`, width: "auto" }

  let logoEl: React.ReactNode

  if (variant === "auto") {
    /* Show dark logo in light mode, light logo in dark mode — no hydration mismatch */
    logoEl = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={srcMap.dark}
          alt="Alpha Trainer"
          style={style}
          draggable={false}
          className={cn("block dark:hidden", className)}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={srcMap.light}
          alt="Alpha Trainer"
          style={style}
          draggable={false}
          className={cn("hidden dark:block", className)}
        />
      </>
    )
  } else {
    logoEl = (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={srcMap[variant]}
        alt="Alpha Trainer"
        style={style}
        draggable={false}
        className={cn(className)}
      />
    )
  }

  if (!href) return <>{logoEl}</>
  return (
    <Link href={href} aria-label="Alpha Trainer — Inicio">
      {logoEl}
    </Link>
  )
}
