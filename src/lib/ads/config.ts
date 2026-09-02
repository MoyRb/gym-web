/**
 * Centralized AdSense configuration.
 *
 * Master switch:
 *   NEXT_PUBLIC_ADS_ENABLED=true   — enables all ad slots
 *
 * Default is false. Set to true ONLY after:
 *   1. AdSense account is approved.
 *   2. Slot IDs are configured for each placement.
 *
 * Publisher ID (shared with site verification meta tag):
 *   NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
 *
 * Slot IDs (leave empty until AdSense approval):
 *   NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD=
 *   NEXT_PUBLIC_ADSENSE_SLOT_EXERCISES=
 *   NEXT_PUBLIC_ADSENSE_SLOT_EXERCISE_DETAIL=
 *   NEXT_PUBLIC_ADSENSE_SLOT_PROGRESS=
 *   NEXT_PUBLIC_ADSENSE_SLOT_POST_WORKOUT=
 *
 * Prohibited placements (product rule — never add):
 *   /dashboard/rutina/entrenar/*  (active workout)
 *   /login, /register, /pricing, /billing/*, auth routes, landing
 */

export type AdPlacement =
  | "dashboard_mid"
  | "exercise_catalog_mid"
  | "exercise_detail_bottom"
  | "progress_mid"
  | "post_workout"

export const adsConfig = {
  // Master switch — false by default. App works normally when false.
  enabled: process.env.NEXT_PUBLIC_ADS_ENABLED === "true",

  // Same var as site verification meta tag — no duplication.
  clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? null,

  // Slot IDs per placement. null = slot renders nothing (no crash, no empty box).
  slots: {
    dashboard_mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD || null,
    exercise_catalog_mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_EXERCISES || null,
    exercise_detail_bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_EXERCISE_DETAIL || null,
    progress_mid: process.env.NEXT_PUBLIC_ADSENSE_SLOT_PROGRESS || null,
    post_workout: process.env.NEXT_PUBLIC_ADSENSE_SLOT_POST_WORKOUT || null,
  } satisfies Record<AdPlacement, string | null>,
}
