import type { MetadataRoute } from "next"
import { siteConfig } from "@/config/site"

// All paths not listed in disallow are implicitly allowed.
// Explicit Allow directives for every public page are redundant and add noise.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: [
          "/dashboard/",
          "/api/",
          "/auth/",
          "/login",
          "/register",
          "/verify-email",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}
