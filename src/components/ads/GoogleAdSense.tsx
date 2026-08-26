import Script from "next/script"

/**
 * Loads the Google AdSense script once for the entire site.
 *
 * Requirements:
 * - NEXT_PUBLIC_ADSENSE_CLIENT_ID must be set in the environment.
 * - Only renders in production (NODE_ENV === "production").
 * - Does NOT insert ad slots — site verification only in this iteration.
 * - Auto Ads must be enabled deliberately in the AdSense dashboard.
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
