"use client";

import NextTopLoader from "nextjs-toploader";

/**
 * Global route transition indicator (top bar) for App Router navigations.
 * Matches app primary blue: hsl(210 59% 30%).
 */
export function NavigationProgress() {
  return (
    <NextTopLoader
      color="hsl(210, 59%, 30%)"
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl
      showSpinner={false}
      easing="ease"
      speed={200}
      shadow="0 0 12px hsl(210 59% 40% / 0.35)"
      zIndex={99999}
    />
  );
}
