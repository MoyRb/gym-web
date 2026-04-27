import Link from "next/link"
import { cn } from "@/lib/utils"

interface BrandMarkProps {
  href?: string
  className?: string
  variant?: "header" | "hero" | "auth" | "sidebar"
}

const variantStyles = {
  header: "text-xl sm:text-2xl",
  hero: "text-3xl sm:text-4xl lg:text-5xl",
  auth: "text-xl sm:text-2xl",
  sidebar: "text-lg",
} as const

export function BrandMark({ href = "/", className, variant = "header" }: BrandMarkProps) {
  const content = (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 font-black uppercase tracking-[0.08em] leading-none",
        variantStyles[variant],
        className
      )}
      aria-label="FITNESS CLUB"
    >
      <span className="text-primary">FITNESS</span>
      <span className="text-slate-700">CLUB</span>
    </span>
  )

  if (!href) return content
  return <Link href={href}>{content}</Link>
}
