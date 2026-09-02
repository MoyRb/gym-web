"use client"

import { useEffect, useRef } from "react"
import { adsConfig, type AdPlacement } from "@/lib/ads/config"

interface AdSlotProps {
  /** Semantic placement identifier — for debugging and future analytics. */
  placement: AdPlacement
  /**
   * AdSense slot ID for this placement. Read from adsConfig.slots[placement].
   * Callers should pass adsConfig.slots[placement] directly.
   * Null → slot returns null (no empty box, no crash).
   */
  slotId: string | null
  /**
   * From getUserEntitlements().showAds (server-resolved).
   * Free = true, Pro = false, Founder = false.
   * Caller is responsible for passing the correct value — never derive from client state.
   */
  showAds: boolean
}

/**
 * Renders a Google AdSense display ad slot.
 *
 * Renders ONLY when all three conditions are true:
 *   1. adsConfig.enabled === true  (NEXT_PUBLIC_ADS_ENABLED=true)
 *   2. slotId is a non-empty string (slot env var configured)
 *   3. showAds === true            (user is on Free plan, server-resolved)
 *
 * When any condition is false: returns null — no placeholder, no empty space, no CLS.
 *
 * Prohibited placements (never use this component in):
 *   - /dashboard/rutina/entrenar/*  (active workout — product rule)
 *   - /login, /register, /pricing, /billing/*, auth routes, landing page
 *
 * Performance note: GoogleAdSense script loader in layout.tsx is a global dependency.
 * Future optimization: skip loader entirely for Pro/Founder users (tracked in backlog).
 */
export function AdSlot({ placement, slotId, showAds }: AdSlotProps) {
  const initialized = useRef(false)

  const shouldRender = adsConfig.enabled && Boolean(slotId) && showAds

  useEffect(() => {
    if (!shouldRender || initialized.current) return
    initialized.current = true

    try {
      const w = window as Window & { adsbygoogle?: object[] }
      w.adsbygoogle = w.adsbygoogle ?? []
      w.adsbygoogle.push({})
    } catch {
      // adsbygoogle not ready yet — ins element renders empty, no crash.
    }
  }, [shouldRender])

  if (!shouldRender) return null

  return (
    <div
      role="complementary"
      aria-label="Publicidad"
      data-ad-placement={placement}
      // Reserve minimum height to reduce CLS when ad loads.
      // Only applied when the slot will actually render.
      className="flex w-full items-center justify-center overflow-hidden"
      style={{ minHeight: 90 }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client={adsConfig.clientId ?? ""}
        data-ad-slot={slotId ?? ""}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
