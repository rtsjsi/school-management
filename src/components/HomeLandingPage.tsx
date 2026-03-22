import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { HomeSignOutButton } from "@/components/HomeSignOutButton";
import { ROLES } from "@/types/auth";

type Props = {
  user: AuthUser | null;
  schoolName: string;
  /** User arrived after trying to open the admin dashboard (soft context only). */
  fromDashboardAttempt: boolean;
  canUseDashboard: boolean;
};

export function HomeLandingPage({
  user,
  schoolName,
  fromDashboardAttempt,
  canUseDashboard,
}: Props) {
  const roleLabel = user ? (ROLES[user.role as keyof typeof ROLES] ?? user.role) : null;
  const displayName = user?.fullName?.trim() || user?.email || "there";

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-muted/45 via-background to-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.25)_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_80%_55%_at_50%_20%,#000_45%,transparent)]"
        aria-hidden
      />

      <header className="relative z-10 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" aria-hidden />
            </div>
            <span className="truncate font-semibold text-foreground">{schoolName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <HomeSignOutButton />
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
        {fromDashboardAttempt && (
          <div
            className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground"
            role="status"
          >
            You&apos;re on the school home page. For day-to-day questions, contact your school office—they&apos;ll
            point you to the right place.
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card/90 p-8 shadow-lg ring-1 ring-border/40 backdrop-blur-sm sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-9 w-9" strokeWidth={1.5} aria-hidden />
          </div>

          <h1 className="text-balance text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {user ? `Welcome, ${displayName}` : `Welcome to ${schoolName}`}
          </h1>

          {!user && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Sign in with your school account to continue.
            </p>
          )}

          {user && roleLabel && (
            <p className="mt-2 text-center text-sm text-muted-foreground">Signed in as {roleLabel}</p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {!user && (
              <>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/forgot-password">Forgot password?</Link>
                </Button>
              </>
            )}

            {user && canUseDashboard && (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/welcome">Continue to app</Link>
              </Button>
            )}

            {user && !canUseDashboard && (
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                Your school uses this system for administration and records. If you need something specific, your
                principal or office staff can help.
              </p>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {schoolName} · School management
        </p>
      </main>
    </div>
  );
}
