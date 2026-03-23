import { GraduationCap, Lightbulb, CalendarDays, Heart } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { ROLES } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import { formatWelcomeDate, getThoughtOfTheDay } from "@/lib/thought-of-the-day";

type Props = {
  user: AuthUser;
  schoolName: string;
};

/**
 * Default in-app landing shown at /welcome for every signed-in user.
 */
export function AppWelcomePage({ user, schoolName }: Props) {
  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;
  const displayName = user.fullName?.trim() || user.email || "there";
  const thought = getThoughtOfTheDay();
  const todayLabel = formatWelcomeDate();

  return (
    <div className="space-y-6">
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
        <p className="mt-3 text-sm text-muted-foreground">{schoolName}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-primary">
            <Lightbulb className="h-5 w-5 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Thought for the day</h2>
          </div>
          <blockquote className="border-l-2 border-primary/40 pl-4">
            <p className="text-base leading-relaxed text-foreground sm:text-lg">&ldquo;{thought.quote}&rdquo;</p>
            {thought.attribution ? (
              <footer className="mt-3 text-sm text-muted-foreground">— {thought.attribution}</footer>
            ) : null}
          </blockquote>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-primary">
              <CalendarDays className="h-5 w-5 shrink-0" aria-hidden />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Today</h2>
            </div>
            <p className="text-lg font-medium text-foreground leading-snug">{todayLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              A fresh day to support students, colleagues, and your school community.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-5 sm:p-6">
            <div className="flex gap-3">
              <Heart className="h-5 w-5 shrink-0 text-primary/80 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-medium text-foreground">Thank you for what you do</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Every record you keep and every task you complete helps the school run smoothly. Use the sidebar when
                  you&apos;re ready to jump in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
