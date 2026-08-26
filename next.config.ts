import type { NextConfig } from "next"

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent clickjacking via iframes from other origins
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Reduce referrer data leakage to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict access to browser features not needed by the app.
  // NOTE: Reevaluate payment=() once Stripe / Payment Request API / Google Play Billing
  // (TWA) is implemented — the restriction must be lifted for payment flows.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Enforce HTTPS (only applied when served over HTTPS — Vercel handles this)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // NOTE: Content-Security-Policy is intentionally omitted here.
  // Alpha Trainer uses Supabase (dynamic endpoints), signed storage URLs,
  // Vercel analytics injection, and Google Fonts (build-time inlined by Next.js).
  // A CSP must be validated against the full production surface before enforcing.
  // Recommended approach: add CSP-Report-Only first, collect violations for
  // 1-2 weeks, then convert to enforced CSP.
]

const nextConfig: NextConfig = {
  // Remove X-Powered-By: Next.js from all responses — no value in advertising the stack.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
