import { ImageResponse } from "next/og"

// Next.js file-based OG image — auto-discovered as og:image and twitter:image
// for the root segment and inherited by all child routes that don't override it.
// Served at /opengraph-image with the correct Content-Type and dimensions.

export const runtime = "edge"
export const alt = "Alpha Trainer — Entrena con inteligencia. Progresa con datos."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const BG = "#0A0A0B"
const RED = "#CF2020"
const WHITE = "#F2F2F3"
const MUTED = "#6B6B6F"

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: BG,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: RED,
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 100px",
          }}
        >
          {/* Brand label */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: RED,
              letterSpacing: 7,
              textTransform: "uppercase",
              marginBottom: 36,
              display: "flex",
            }}
          >
            ALPHA TRAINER
          </div>

          {/* Main headline line 1 */}
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: WHITE,
              textAlign: "center",
              lineHeight: "1",
              marginBottom: 12,
              display: "flex",
            }}
          >
            Entrena con inteligencia.
          </div>

          {/* Main headline line 2 */}
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: WHITE,
              textAlign: "center",
              lineHeight: "1",
              marginBottom: 48,
              display: "flex",
            }}
          >
            Progresa con datos.
          </div>

          {/* Sub-tagline */}
          <div
            style={{
              fontSize: 18,
              color: MUTED,
              letterSpacing: 4,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            IA · Entrenamiento · Progreso
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: RED,
            opacity: 0.35,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  )
}
