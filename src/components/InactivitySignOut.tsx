"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutOverlay } from "@/components/SignOutOverlay";
import { signOutAndGoToLogin, waitForSignOutOverlayPaint } from "@/lib/sign-out-smooth";

const INACTIVITY_MS = 600_000; // 600 seconds (10 minutes)

const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"] as const;

export function InactivitySignOut() {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signingOutRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);
    try {
      await waitForSignOutOverlayPaint();
      await signOutAndGoToLogin(router);
    } catch {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  }, [router]);

  const resetTimer = useCallback(() => {
    if (signingOutRef.current) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timeoutRef.current = setTimeout(() => {
      void signOut();
    }, INACTIVITY_MS);
  }, [signOut]);

  useEffect(() => {
    resetTimer();

    const handleActivity = () => resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer]);

  return <SignOutOverlay open={signingOut} message="Signing out due to inactivity…" />;
}
