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
 * Default in-app landing at /welcome — sized to avoid scrolling in the main pane.
 */
export function AppWelcomePage({ user, schoolName }: Props) {
  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;
  const displayName = user.fullName?.trim() || user.email || "there";
  const thought = getThoughtOfTheDay();
  const todayLabel = formatWelcomeDate();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden sm:gap-4">
      {/* Header strip */}
      <div className="shrink-0 rounded-xl border border-border/80 bg-gradient-to-br from-primary/5 via-background to-muted/30 px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
            <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Welcome, {displayName}
            </h1>
            <p className="caption mt-1 flex flex-wrap items-center gap-1.5">
              <span>Signed in as</span>
              <Badge variant="secondary" className="text-[10px] font-medium sm:text-xs">
                {roleLabel}
              </Badge>
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground" title={schoolName}>
              {schoolName}
            </p>
          </div>
        </div>
      </div>

      {/* Main grid — min-h-0 lets children shrink / clip */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 sm:gap-3 lg:gap-4">
        <div className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-2 flex shrink-0 items-center gap-1.5 text-primary">
            <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground sm:text-xs">
              Thought for the day
            </h2>
          </div>
          <blockquote className="min-h-0 border-l-2 border-primary/40 pl-3">
            <p className="line-clamp-4 text-xs leading-snug text-foreground sm:line-clamp-5 sm:text-sm sm:leading-snug">
              &ldquo;{thought.quote}&rdquo;
            </p>
            {thought.attribution ? (
              <footer className="mt-1.5 truncate text-[10px] text-muted-foreground sm:text-xs">
                — {thought.attribution}
              </footer>
            ) : null}
          </blockquote>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-hidden sm:min-h-0">
          <div className="shrink-0 rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-primary">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground sm:text-xs">Today</h2>
            </div>
            <p className="text-sm font-medium leading-tight text-foreground sm:text-base">{todayLabel}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs">
              Support students, colleagues, and your school community.
            </p>
          </div>

          <div className="min-h-0 flex-1 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] p-3 sm:p-3.5">
            <div className="flex gap-2">
              <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground sm:text-sm">Thank you for what you do</p>
                <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted-foreground sm:line-clamp-4 sm:text-xs">
                  Your work keeps the school running smoothly. Open any section from the sidebar when you&apos;re ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
