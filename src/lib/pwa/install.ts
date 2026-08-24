/** Returns true if the app is running in standalone (installed PWA) mode. SSR-safe. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches
}

/**
 * Detects whether the device is running iOS/iPadOS.
 * Used only for UX copy — not relied on for feature detection.
 * SSR-safe.
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Detects Android. SSR-safe. */
export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false
  return /android/i.test(navigator.userAgent)
}
