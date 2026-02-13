"use client";

import { Loader2 } from "lucide-react";

const buttonBase =
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:pointer-events-none disabled:opacity-70 disabled:cursor-not-allowed";

export function SubmitButton({
  loading = false,
  disabled,
  children,
  loadingLabel,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={`bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${buttonBase} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
