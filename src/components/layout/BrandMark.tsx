import { AlphaTrainerLogo } from "@/components/layout/AlphaTrainerLogo"
import { cn } from "@/lib/utils"

/**
 * BrandMark — thin wrapper kept for backward compatibility.
 * Delegates to AlphaTrainerLogo with appropriate variant per context.
 */
interface BrandMarkProps {
  href?: string
  className?: string
  variant?: "header" | "hero" | "auth" | "sidebar"
}

const heightMap = {
  header: 26,
  hero: 44,
  auth: 28,
  sidebar: 24,
} as const

const variantMap = {
  header: "auto",
  hero: "accent",
  auth: "light",
  sidebar: "light",
} as const

export function BrandMark({ href, className, variant = "header" }: BrandMarkProps) {
  return (
    <AlphaTrainerLogo
      href={href}
      variant={variantMap[variant] as "auto" | "accent" | "light" | "dark"}
      height={heightMap[variant]}
      className={cn(className)}
    />
  )
}
