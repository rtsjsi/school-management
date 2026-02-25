"use client";

import { DashboardUserMenu } from "@/components/DashboardUserMenu";
import type { AuthUser } from "@/lib/auth";

export function DashboardHeader({ user }: { user: AuthUser }) {
  return (
    <header className="shrink-0 z-20 flex h-14 items-center justify-end gap-4 border-b border-border bg-background px-4 sm:px-6 lg:px-8 shadow-[var(--shadow-header)]">
      <div className="shrink-0">
        <DashboardUserMenu user={user} />
      </div>
    </header>
  );
}
