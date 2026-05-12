import { GraduationCap, Lightbulb, CalendarDays, ScrollText } from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { ROLES } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import { formatWelcomeDate, getThoughtOfTheDay } from "@/lib/thought-of-the-day";
import { getOnThisDayLine } from "@/lib/on-this-day";

import { getRandomWelcomeThankYou } from "@/lib/welcome-thank-you";

type Props = {
  user: AuthUser;
  schoolName: string;
};

/**
 * Default in-app landing at /welcome — cards hug content; pane scrolls if needed.
 */
export async function AppWelcomePage({ user, schoolName }: Props) {
  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;
  const displayName = user.fullName?.trim() || user.email || "there";
  const thought = getThoughtOfTheDay();
  const todayLabel = formatWelcomeDate();
  const onThisDay = getOnThisDayLine();

  const thankYou = getRandomWelcomeThankYou();

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* Header — welcome + rotating appreciation message */}
      <div className="w-full shrink-0 rounded-xl border border-border/80 bg-gradient-to-br from-primary/5 via-background to-muted/30 px-4 py-3 shadow-sm sm:px-5 sm:py-3.5">
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
            <p className="mt-1 text-xs text-muted-foreground break-words" title={schoolName}>
              {schoolName}
            </p>
            <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
              {thankYou}
            </p>
          </div>
        </div>
      </div>

      <div className="grid w-full auto-rows-min grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-3 lg:gap-4">
        {/* Column 1: Today — date, on this day */}
        <div className="flex w-full flex-col gap-3 sm:gap-3">
          <div className="w-full rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-primary">
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground sm:text-xs">Today</h2>
            </div>
            <p className="text-sm font-medium leading-tight text-foreground sm:text-base">{todayLabel}</p>



            <div className="mt-2 border-t border-border/60 pt-2">
              <div className="mb-1 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                  <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  On this day
                </div>
                <p className="text-[10px] leading-tight text-muted-foreground/90 sm:text-[11px]">
                  India observances &amp; well-known international days
                </p>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">{onThisDay}</p>
            </div>
          </div>
        </div>

        {/* Column 2: Thought for the day */}
        <div className="w-full rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:p-4">
          <div className="mb-2 flex items-center gap-1.5 text-primary">
            <Lightbulb className="h-4 w-4 shrink-0" aria-hidden />
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-foreground sm:text-xs">
              Thought for the day
            </h2>
          </div>
          <blockquote className="border-l-2 border-primary/40 pl-3">
            <p className="text-xs leading-snug text-foreground sm:text-sm sm:leading-snug">
              &ldquo;{thought.quote}&rdquo;
            </p>
            {thought.attribution ? (
              <footer className="mt-1.5 text-[10px] text-muted-foreground sm:text-xs">— {thought.attribution}</footer>
            ) : null}
          </blockquote>
        </div>
      </div>
    </div>
  );
}
