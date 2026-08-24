/**
 * Returns true if the given path is safe to use as an internal redirect target.
 * Prevents open redirects by ensuring the path is relative and well-formed.
 */
export function isSafeRedirectPath(path: string): boolean {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
}
