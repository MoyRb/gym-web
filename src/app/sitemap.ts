import type { MetadataRoute } from "next"
import { siteConfig } from "@/config/site"

const base = siteConfig.url

// lastModified is intentionally omitted — no stable real modification date source exists.
// Using new Date() per request would cause search engines to re-crawl constantly.
// Pages are served with stable changeFrequency + priority signals instead.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/pricing`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/privacidad`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/terminos`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/seguridad`,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${base}/soporte`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/eliminar-cuenta`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]
}
