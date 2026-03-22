"use client";

import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string; submit?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string } = {};
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/update-password")}`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setErrors((prev) => ({ ...prev, submit: error.message }));
        return;
      }

      setSent(true);
    } catch {
      setErrors((prev) => ({ ...prev, submit: "Something went wrong. Please try again." }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="overflow-hidden border-border/60 bg-card/80 shadow-2xl shadow-slate-900/10 ring-1 ring-border/50 backdrop-blur-sm dark:bg-card/90 dark:shadow-black/40">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-sky-500 to-indigo-500" aria-hidden />
        <CardHeader className="space-y-4 pb-2 pt-8 text-center sm:text-left">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner ring-1 ring-primary/15 sm:mx-0">
            <KeyRound className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-balance text-3xl font-bold tracking-tight">Forgot password</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              We&apos;ll email you a secure link to choose a new password.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 pt-2">
          {sent ? (
            <div className="space-y-5">
              <div
                role="status"
                className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
              >
                <p>
                  If an account exists for{" "}
                  <span className="font-semibold text-foreground dark:text-emerald-50">{email}</span>, check
                  your inbox for reset instructions.
                </p>
                <p className="mt-2 text-emerald-800/90 dark:text-emerald-200/90">
                  Don&apos;t forget spam — the link expires after a limited time.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex w-full h-11 items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="you@school.edu"
                    autoComplete="email"
                    className={`h-11 rounded-xl border-border/80 bg-background/80 pl-10 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/20 ${
                      errors.email ? "border-destructive focus-visible:ring-destructive" : ""
                    }`}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {errors.submit && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errors.submit}
                </p>
              )}

              <SubmitButton
                loading={isLoading}
                loadingLabel="Sending…"
                className="h-11 w-full rounded-xl text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                Send reset link
              </SubmitButton>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
                >
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        Reset links are single-use and expire for your security.
      </p>
    </div>
  );
}
