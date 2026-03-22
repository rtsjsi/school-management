import { Loader2 } from "lucide-react";

/** Shown while auth route segments load (login, forgot password, etc.). */
export default function AuthLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12 text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">Loading…</p>
    </div>
  );
}
