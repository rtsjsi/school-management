"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NoDashboardAccessCard() {
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

  return (
    <Card className="overflow-hidden border-border/60 bg-card/90 shadow-lg ring-1 ring-border/50">
      <div className="h-1 w-full bg-amber-500/90" aria-hidden />
      <CardHeader className="space-y-2 pt-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </div>
        <CardTitle className="text-center text-xl font-bold">No dashboard access</CardTitle>
        <CardDescription className="text-center text-sm">
          The web dashboard is available only to <strong>Principal</strong> and <strong>Admin</strong> accounts.
          Your role does not include access to this area.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <p className="text-center text-xs text-muted-foreground">
          If you believe this is a mistake, contact your school administrator.
        </p>
        <Button
          type="button"
          variant="default"
          className="w-full gap-2"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </CardContent>
    </Card>
  );
}
