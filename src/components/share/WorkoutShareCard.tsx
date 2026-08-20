"use client"

import React from "react"
import {
  formatShareDate,
  formatShareDuration,
  formatShareVolumeNumber,
} from "./formatters"
import { CARD_DIMS } from "./types"
import type { ShareCardOptions, ShareHighlight, WorkoutShareData } from "./types"

// ── FORGE color constants — hardcoded for clean PNG export ────────────────────
// CSS variables don't resolve reliably in html-to-image; use literals.

const C = {
  bg:     "#0A0A0B",
  red:    "#CF2020",
  text:   "#F2F2F3",
  muted:  "#8B8B93",
  border: "rgba(255,255,255,0.08)",
} as const

// Fonts — must match loaded web fonts so html-to-image can resolve them
const FH = '"Space Grotesk", Inter, system-ui, sans-serif'  // headings / numbers
const FB = 'Inter, system-ui, sans-serif'                    // body / labels

// ── Shared primitives ─────────────────────────────────────────────────────────

function Logo({ width }: { width: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/brand/alpha-trainer/logo-wordmark-light.svg"
      alt="Alpha Trainer"
      width={width}
      style={{ width, height: "auto", display: "block" }}
    />
  )
}

// Dot-separated compact metrics line used in Achievement secondary row
function MetricsDotRow({
  items,
  color = C.muted,
}: {
  items: { value: string; label: string }[]
  color?: string
}) {
  const visible = items.filter((i) => i.value !== "")
  if (visible.length === 0) return null
  return (
    <p
      style={{
        margin:        0,
        color,
        fontSize:      13,
        fontWeight:    500,
        fontFamily:    FB,
        letterSpacing: "0.05em",
      }}
    >
      {visible.map((i, idx) => (
        <React.Fragment key={i.label}>
          {idx > 0 && <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>}
          <span>{i.value} <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>{i.label}</span></span>
        </React.Fragment>
      ))}
    </p>
  )
}

// ── Background layer (shared by all presets) ──────────────────────────────────

function Background({
  userPhoto,
  scrim,
}: {
  userPhoto?: string
  scrim?:     string
}) {
  return (
    <>
      {userPhoto && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={userPhoto}
          alt=""
          aria-hidden="true"
          style={{
            position:       "absolute",
            inset:          0,
            width:          "100%",
            height:         "100%",
            objectFit:      "cover",
            objectPosition: "center",
            pointerEvents:  "none",
          }}
        />
      )}
      {scrim && (
        <div
          aria-hidden="true"
          style={{
            position:      "absolute",
            inset:         0,
            background:    scrim,
            pointerEvents: "none",
          }}
        />
      )}
    </>
  )
}

// ── ACHIEVEMENT card ──────────────────────────────────────────────────────────
// Highlight is the hero element. Left-aligned editorial layout. Red left strip.

function AchievementCard({
  data,
  highlight,
  vis,
  userPhoto,
  containerRef,
}: {
  data:         WorkoutShareData
  highlight:    ShareHighlight
  vis:          ShareCardOptions["visibility"]
  userPhoto?:   string
  containerRef: React.Ref<HTMLDivElement>
}) {
  const dateStr     = formatShareDate(data.date)
  const dur         = formatShareDuration(data.durationSeconds)
  const { w, h }    = CARD_DIMS

  // Secondary metrics visible in Achievement (dot row)
  const secondaryItems: { value: string; label: string }[] = []
  if (vis.duration      && data.durationSeconds > 0) secondaryItems.push({ value: dur,                          label: "min" })
  if (vis.sets          && data.completedSets > 0)   secondaryItems.push({ value: String(data.completedSets),  label: "series" })
  if (vis.reps          && data.totalReps > 0)        secondaryItems.push({ value: String(data.totalReps),      label: "reps" })
  if (vis.exerciseCount && data.exerciseCount > 0)    secondaryItems.push({ value: String(data.exerciseCount),  label: "ejercicios" })
  if (vis.volume        && data.totalVolumeKg > 0)    secondaryItems.push({ value: formatShareVolumeNumber(data.totalVolumeKg), label: "kg" })

  const bgScrim = userPhoto
    ? "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.70) 40%, rgba(0,0,0,0.92) 100%)"
    : undefined

  return (
    <div
      ref={containerRef}
      style={{
        width:      w,
        height:     h,
        background: userPhoto ? "transparent" : C.bg,
        position:   "relative",
        overflow:   "hidden",
        boxSizing:  "border-box",
        fontFamily: FB,
      }}
    >
      <Background userPhoto={userPhoto} scrim={bgScrim} />

      {/* Red left strip */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", background: C.red }}
      />

      {/* Content (padded left past the strip) */}
      <div
        style={{
          position:      "absolute",
          inset:         0,
          display:       "flex",
          flexDirection: "column",
          padding:       "44px 40px 44px 28px",
        }}
      >
        {/* Logo + optional workout name top-right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo width={108} />
          {/* Show workout name here only when the highlight doesn't already embed it */}
          {vis.workoutName && highlight.type !== "session_completed" && (
            <p
              style={{
                margin:        0,
                color:         C.muted,
                fontSize:      11,
                fontWeight:    600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontFamily:    FH,
              }}
            >
              {data.workoutName.toUpperCase()}
            </p>
          )}
        </div>

        {/* Vertical spacer */}
        <div style={{ flex: 1, minHeight: 60 }} />

        {/* ── Highlight block ── */}
        <div>
          {/* Label */}
          <p
            style={{
              margin:        0,
              color:         C.red,
              fontSize:      11,
              fontWeight:    600,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              fontFamily:    FB,
            }}
          >
            {highlight.label}
          </p>

          {/* Headline */}
          <p
            style={{
              margin:        "12px 0 0",
              color:         C.text,
              fontSize:      highlight.headline.length > 10 ? 64 : 80,
              fontWeight:    700,
              fontFamily:    FH,
              letterSpacing: "-0.03em",
              lineHeight:    0.88,
              wordBreak:     "break-word",
            }}
          >
            {highlight.headline}
          </p>

          {/* Subline */}
          {highlight.subline && (
            <p
              style={{
                margin:        "16px 0 0",
                color:         C.text,
                fontSize:      22,
                fontWeight:    600,
                fontFamily:    FH,
                letterSpacing: "0.02em",
                opacity:       0.85,
              }}
            >
              {highlight.subline}
            </p>
          )}
        </div>

        {/* Vertical spacer */}
        <div style={{ flex: 1, minHeight: 40 }} />

        {/* Secondary metrics dot row */}
        {secondaryItems.length > 0 && (
          <>
            <div style={{ height: 1, background: C.border, marginBottom: 24 }} />
            <MetricsDotRow items={secondaryItems} />
            <div style={{ height: 28 }} />
          </>
        )}

        {/* Date + branding */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {vis.date && (
            <p style={{ margin: 0, color: C.muted, fontSize: 11, letterSpacing: "0.10em", fontFamily: FB }}>
              {dateStr}
            </p>
          )}
          <p style={{ margin: 0, color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", fontFamily: FH, marginLeft: "auto" }}>
            ALPHA TRAINER
          </p>
        </div>
      </div>
    </div>
  )
}

// ── MINIMAL card ──────────────────────────────────────────────────────────────
// Breathing room. Centered layout. Workout name is the focus.

function MinimalCard({
  data,
  vis,
  userPhoto,
  containerRef,
}: {
  data:         WorkoutShareData
  vis:          ShareCardOptions["visibility"]
  userPhoto?:   string
  containerRef: React.Ref<HTMLDivElement>
}) {
  const dateStr  = formatShareDate(data.date)
  const dur      = formatShareDuration(data.durationSeconds)
  const { w, h } = CARD_DIMS

  const bgScrim = userPhoto
    ? "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 100%)"
    : undefined

  return (
    <div
      ref={containerRef}
      style={{
        width:          w,
        height:         h,
        background:     userPhoto ? "transparent" : C.bg,
        position:       "relative",
        overflow:       "hidden",
        boxSizing:      "border-box",
        fontFamily:     FB,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        padding:        "56px 48px",
      }}
    >
      <Background userPhoto={userPhoto} scrim={bgScrim} />

      {/* Content — all relative, centered */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "100%", flex: 1 }}>

        {/* Logo */}
        <Logo width={120} />

        {/* Spacer */}
        <div style={{ flex: 2 }} />

        {/* SESIÓN COMPLETADA */}
        <p
          style={{
            margin:        0,
            color:         C.muted,
            fontSize:      11,
            fontWeight:    500,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            fontFamily:    FB,
            textAlign:     "center",
          }}
        >
          SESIÓN COMPLETADA
        </p>

        {/* Workout name — dominant */}
        {vis.workoutName && (
          <p
            style={{
              margin:        "16px 0 0",
              color:         C.text,
              fontSize:      data.workoutName.length > 10 ? 52 : 64,
              fontWeight:    700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontFamily:    FH,
              lineHeight:    1.0,
              textAlign:     "center",
            }}
          >
            {data.workoutName}
          </p>
        )}

        {/* Thin red accent bar */}
        <div style={{ width: 48, height: 3, background: C.red, borderRadius: 2, marginTop: 28 }} />

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 32 }} />

        {/* Secondary info — sparse */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {vis.duration && data.durationSeconds > 0 && (
            <p
              style={{
                margin:        0,
                color:         C.text,
                fontSize:      28,
                fontWeight:    700,
                fontFamily:    FH,
                letterSpacing: "-0.01em",
                textAlign:     "center",
              }}
            >
              {dur}
            </p>
          )}
          {vis.exerciseCount && data.exerciseCount > 0 && (
            <p
              style={{
                margin:        0,
                color:         C.muted,
                fontSize:      14,
                fontWeight:    500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                fontFamily:    FB,
                textAlign:     "center",
              }}
            >
              {data.exerciseCount} {data.exerciseCount === 1 ? "Ejercicio" : "Ejercicios"}
            </p>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 2 }} />

        {/* Date + branding */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          {vis.date && (
            <p style={{ margin: 0, color: C.muted, fontSize: 11, letterSpacing: "0.10em", fontFamily: FB }}>
              {dateStr}
            </p>
          )}
          <p style={{ margin: 0, color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", fontFamily: FH, marginLeft: "auto" }}>
            ALPHA TRAINER
          </p>
        </div>
      </div>
    </div>
  )
}

// ── FULL STATS card ───────────────────────────────────────────────────────────
// Data-dense. Metric list layout.

function FullCard({
  data,
  vis,
  userPhoto,
  containerRef,
}: {
  data:         WorkoutShareData
  vis:          ShareCardOptions["visibility"]
  userPhoto?:   string
  containerRef: React.Ref<HTMLDivElement>
}) {
  const dateStr  = formatShareDate(data.date)
  const dur      = formatShareDuration(data.durationSeconds)
  const { w, h } = CARD_DIMS

  const metrics: { label: string; value: string }[] = []
  if (vis.duration      && data.durationSeconds > 0) metrics.push({ label: "Duración",   value: dur })
  if (vis.sets          && data.completedSets > 0)   metrics.push({ label: "Series",     value: String(data.completedSets) })
  if (vis.reps          && data.totalReps > 0)        metrics.push({ label: "Reps",       value: String(data.totalReps) })
  if (vis.exerciseCount && data.exerciseCount > 0)    metrics.push({ label: "Ejercicios", value: String(data.exerciseCount) })
  if (vis.volume        && data.totalVolumeKg > 0)    metrics.push({ label: "Volumen",    value: `${formatShareVolumeNumber(data.totalVolumeKg)} KG` })

  const bgScrim = userPhoto
    ? "rgba(0,0,0,0.80)"
    : undefined

  return (
    <div
      ref={containerRef}
      style={{
        width:      w,
        height:     h,
        background: userPhoto ? "transparent" : C.bg,
        position:   "relative",
        overflow:   "hidden",
        boxSizing:  "border-box",
        fontFamily: FB,
      }}
    >
      <Background userPhoto={userPhoto} scrim={bgScrim} />

      {/* Content */}
      <div
        style={{
          position:      "absolute",
          inset:         0,
          display:       "flex",
          flexDirection: "column",
          padding:       "44px 44px",
        }}
      >
        {/* Logo + red bar */}
        <Logo width={108} />
        <div style={{ width: "100%", height: 3, background: C.red, borderRadius: 2, marginTop: 20 }} />

        {/* Spacer */}
        <div style={{ height: 32 }} />

        {/* SESIÓN COMPLETADA + workout name */}
        <p style={{ margin: 0, color: C.muted, fontSize: 11, fontWeight: 500, letterSpacing: "0.24em", textTransform: "uppercase", fontFamily: FB }}>
          SESIÓN COMPLETADA
        </p>
        {vis.workoutName && (
          <p style={{ margin: "8px 0 0", color: C.text, fontSize: 36, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", fontFamily: FH, lineHeight: 1 }}>
            {data.workoutName}
          </p>
        )}

        {/* Spacer */}
        <div style={{ height: 40 }} />

        {/* Metric rows */}
        {metrics.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {metrics.map((m, i) => (
              <div
                key={m.label}
                style={{
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "baseline",
                  padding:        "14px 0",
                  borderTop:      i === 0 ? `1px solid ${C.border}` : undefined,
                  borderBottom:   `1px solid ${C.border}`,
                }}
              >
                <p style={{ margin: 0, color: C.muted, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: FB }}>
                  {m.label}
                </p>
                <p style={{ margin: 0, color: C.text, fontSize: 26, fontWeight: 700, fontFamily: FH, letterSpacing: "-0.01em" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Flexible spacer */}
        <div style={{ flex: 1 }} />

        {/* Date + branding */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {vis.date && (
            <p style={{ margin: 0, color: C.muted, fontSize: 11, letterSpacing: "0.10em", fontFamily: FB }}>
              {dateStr}
            </p>
          )}
          <p style={{ margin: 0, color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", fontFamily: FH, marginLeft: "auto" }}>
            ALPHA TRAINER
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface WorkoutShareCardProps {
  data:    WorkoutShareData
  options: ShareCardOptions
}

/**
 * The visual share card.
 *
 * Renders at 540×960 CSS pixels (export at pixelRatio:2 → 1080×1920 PNG).
 *
 * - "achievement": highlight hero, left-aligned editorial layout
 * - "minimal": clean, centered, breathing room, low data density
 * - "full": data-dense metric list
 *
 * Any preset supports an optional userPhoto background.
 * The forwarded ref points to the root div for html-to-image capture.
 */
export const WorkoutShareCard = React.forwardRef<HTMLDivElement, WorkoutShareCardProps>(
  function WorkoutShareCard({ data, options }, ref) {
    const { preset, highlight, visibility: vis, userPhoto } = options

    if (preset === "minimal") {
      return <MinimalCard data={data} vis={vis} userPhoto={userPhoto} containerRef={ref} />
    }
    if (preset === "full") {
      return <FullCard data={data} vis={vis} userPhoto={userPhoto} containerRef={ref} />
    }
    // default: achievement
    return (
      <AchievementCard
        data={data}
        highlight={highlight}
        vis={vis}
        userPhoto={userPhoto}
        containerRef={ref}
      />
    )
  },
)
