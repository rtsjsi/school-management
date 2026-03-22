import Link from "next/link";
import { GraduationCap, LayoutDashboard } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { ROLES } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  user: AuthUser;
  schoolName: string;
};

/**
 * Default in-app landing shown at /dashboard for every signed-in user.
 * Other modules are peers in the sidebar — this is not a separate “product” from the rest of the app.
 */
export function AppWelcomePage({ user, schoolName }: Props) {
  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;
  const displayName = user.fullName?.trim() || user.email || "there";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/80 bg-gradient-to-br from-primary/5 via-background to-muted/30 p-8 sm:p-10 shadow-sm">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <GraduationCap className="h-8 w-8" strokeWidth={1.5} aria-hidden />
        </div>
        <h1 className="page-title text-balance">Welcome, {displayName}</h1>
        <p className="caption mt-2 flex flex-wrap items-center gap-2">
          <span>Signed in as</span>
          <Badge variant="secondary" className="font-medium">
            {roleLabel}
          </Badge>
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          You&apos;re in <span className="font-medium text-foreground">{schoolName}</span>. Use the{" "}
          <span className="font-medium text-foreground">menu on the left</span> to open the sections your role can
          access — each one is a normal page in this application, same as this home screen.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Open dashboard overview
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
