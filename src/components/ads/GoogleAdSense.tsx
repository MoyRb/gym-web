import Script from "next/script"

/**
 * Loads the Google AdSense SDK script once for the entire site (future ad infrastructure).
 *
 * NOTE: Site verification is handled separately via metadata.other in layout.tsx:
 *   <meta name="google-adsense-account" content="ca-pub-..."> (server-rendered in <head>)
 * This script loader is for future ad slot rendering — NOT for site verification.
 *
 * Requirements:
 * - NEXT_PUBLIC_ADSENSE_CLIENT_ID must be set in the environment (same var as verification).
 * - Only renders in production (NODE_ENV === "production").
 * - Does NOT insert ad slots — Auto Ads must be enabled in the AdSense dashboard.
 */

const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
const isProduction = process.env.NODE_ENV === "production"

export function GoogleAdSense() {
  if (!clientId || !isProduction) return null

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
