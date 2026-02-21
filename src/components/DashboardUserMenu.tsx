"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/auth";
import { ROLES } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";

export function DashboardUserMenu({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;
  const displayName = user.email ?? user.fullName ?? "User";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden sm:block text-right">
        <p className="text-sm font-medium text-foreground truncate max-w-[180px]" title={displayName}>
          {displayName}
        </p>
        <p className="text-xs text-muted-foreground">{roleLabel}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={handleSignOut}
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
  );
}
