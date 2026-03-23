"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  message?: string;
};

/**
 * Full-screen overlay during sign-out so the transition doesn’t feel abrupt.
 */
export function SignOutOverlay({ open, message = "Signing out…" }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, mounted]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message}
    >
      <div className="rounded-2xl border border-border/70 bg-card/95 px-10 py-9 shadow-lg flex flex-col items-center gap-5 max-w-sm mx-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary shrink-0" aria-hidden />
        <p className="text-sm font-medium text-center text-foreground leading-snug">{message}</p>
      </div>
    </div>,
    document.body
  );
}
