import { Loader2 } from "lucide-react";

/** Shown while a dashboard page segment is loading (Next.js Suspense). */
export default function DashboardLoading() {
  return (
    <div
      className="flex min-h-[min(50vh,28rem)] flex-col items-center justify-center gap-4 py-16 text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">Loading…</p>
        <p className="mt-1 text-xs text-muted-foreground">Preparing this page</p>
      </div>
    </div>
  );
}
