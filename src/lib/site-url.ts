/** Allowed internal path after auth callback (blocks open redirects). */
export function safeAuthNextPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
