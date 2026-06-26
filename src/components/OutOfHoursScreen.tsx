"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { signOutAndGoToLogin, waitForSignOutOverlayPaint } from "@/lib/sign-out-smooth";
import { SignOutOverlay } from "@/components/SignOutOverlay";

export function OutOfHoursScreen() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await waitForSignOutOverlayPaint();
      await signOutAndGoToLogin(router);
    } catch (error) {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/30 px-4">
      <SignOutOverlay open={signingOut} />
      
      <div className="flex max-w-md flex-col items-center text-center space-y-6 rounded-lg border bg-background p-8 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">School is Closed</h1>
          <p className="text-muted-foreground">
            You cannot access the application outside of working hours. 
            The system is available from <strong>Monday to Friday, 8:00 AM to 4:00 PM</strong>.
          </p>
        </div>

        <Button onClick={() => void handleSignOut()} className="w-full" size="lg">
          Sign Out
        </Button>
      </div>
    </div>
  );
}
