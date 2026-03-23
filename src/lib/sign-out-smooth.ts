"use client";

import { createClient } from "@/lib/supabase/client";

/** Minimum time the signing-out UI stays visible so it doesn’t flash. */
const MIN_SIGN_OUT_UI_MS = 450;

/** Let the browser paint the overlay before heavy work (double rAF). */
export function waitForSignOutOverlayPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

type AppRouterLike = { push: (href: string) => void; refresh: () => void };

/**
 * Ends the session and navigates to login, keeping the UI calm (no instant jump).
 */
export async function signOutAndGoToLogin(router: AppRouterLike) {
  const t0 = performance.now();
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  const elapsed = performance.now() - t0;
  if (elapsed < MIN_SIGN_OUT_UI_MS) {
    await new Promise((r) => setTimeout(r, MIN_SIGN_OUT_UI_MS - elapsed));
  }

  router.push("/login");
  router.refresh();
}
