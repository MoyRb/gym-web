"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

interface GymLogoProps {
  href?: string
  className?: string
  size?: "sm" | "default" | "lg"
}

const sizeMap = {
  sm: { height: "h-7", text: "text-base" },
  default: { height: "h-8", text: "text-lg" },
  lg: { height: "h-10", text: "text-xl" },
}

export function GymLogo({ href = "/", className, size = "default" }: GymLogoProps) {
  const [imgError, setImgError] = useState(false)
  const sizes = sizeMap[size]

  const content = (
    <div className={cn("flex items-center gap-2", className)}>
      {!imgError ? (
        <Image
          src={siteConfig.logo.src}
          alt={siteConfig.logo.alt}
          width={siteConfig.logo.width}
          height={siteConfig.logo.height}
          className={cn("w-auto object-contain", sizes.height)}
          onError={() => setImgError(true)}
          priority
        />
      ) : (
        <span className={cn("font-black tracking-tight", sizes.text)}>
          <span className="text-primary">FITNESS</span>
          <span className="text-foreground"> CLUB</span>
        </span>
      )}
    </div>
  )

  if (!href) return content
  return <Link href={href}>{content}</Link>
}
