"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/auth";
import { signOutAndGoToLogin, waitForSignOutOverlayPaint } from "@/lib/sign-out-smooth";
import { ROLES } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { SignOutOverlay } from "@/components/SignOutOverlay";
import { LogOut, Loader2 } from "lucide-react";

export function DashboardUserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await waitForSignOutOverlayPaint();
      await signOutAndGoToLogin(router);
    } catch {
      setSigningOut(false);
    }
  };

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;
  const displayName = user.email ?? user.fullName ?? "User";

  return (
    <>
      <SignOutOverlay open={signingOut} />
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-right min-w-0">
          <p className="hidden text-sm font-medium text-foreground truncate max-w-[180px] sm:block" title={displayName}>
            {displayName}
          </p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">{roleLabel}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 transition-opacity duration-200 h-8 px-2 sm:h-8 sm:px-3"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 sm:mr-1.5" />
          )}
          <span className="hidden sm:inline ml-1.5">{signingOut ? "Signing out…" : "Sign out"}</span>
        </Button>
      </div>
    </>
  );
}
