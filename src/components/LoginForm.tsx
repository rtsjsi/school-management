"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; submit?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  /** True after auth succeeds while navigating to home (keep UI busy until unmount). */
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const message = searchParams.get("message");
    const err = searchParams.get("error");
    if (err === "auth") {
      setBannerMessage(message || "Sign-in failed. Try again or request a new reset link.");
    } else if (message) {
      setBannerMessage(message);
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setIsRedirecting(false);
    setErrors((prev) => ({ ...prev, submit: undefined }));

    let navigatingAway = false;
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrors((prev) => ({ ...prev, submit: error.message }));
        return;
      }

      if (data.user) {
        navigatingAway = true;
        setIsRedirecting(true);
        router.push("/");
        router.refresh();
        // Do not clear loading — navigation is still in progress; finally is skipped below.
      }
    } catch {
      setErrors((prev) => ({ ...prev, submit: "Something went wrong. Please try again." }));
    } finally {
      if (!navigatingAway) {
        setIsLoading(false);
        setIsRedirecting(false);
      }
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Card className="relative overflow-hidden border-border/60 bg-card/90 shadow-lg shadow-slate-900/8 ring-1 ring-border/50 backdrop-blur-sm dark:bg-card/95 dark:shadow-black/30">
        {(isLoading || isRedirecting) && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/75 px-6 text-center backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {isRedirecting ? "Taking you home…" : "Signing you in…"}
            </p>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              {isRedirecting ? "Almost there. This can take a few seconds." : "Verifying your credentials."}
            </p>
          </div>
        )}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-sky-500 to-indigo-500" aria-hidden />
        <CardHeader className="space-y-2 pb-0 pt-4 text-center sm:text-left sm:pt-5">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner ring-1 ring-primary/15 sm:mx-0">
            <LogIn className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="space-y-0.5">
            <CardTitle className="text-balance text-xl font-bold tracking-tight sm:text-2xl">Sign in</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Use your school email and password.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-5 pt-3 sm:pb-6">
          {bannerMessage && (
            <p
              role="status"
              className={`rounded-lg border px-3 py-2 text-xs leading-snug sm:text-sm ${
                searchParams.get("error") === "auth"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
              }`}
            >
              {bannerMessage}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium sm:text-sm">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:h-4 sm:w-4" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={isLoading || isRedirecting}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="you@school.edu"
                  className={`h-9 rounded-lg border-border/80 bg-background/80 pl-9 text-sm sm:h-10 sm:rounded-xl sm:pl-10 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/20 ${
                    errors.email ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive sm:text-sm">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium sm:text-sm">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground sm:h-4 sm:w-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  disabled={isLoading || isRedirecting}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`h-9 rounded-lg border-border/80 bg-background/80 pl-9 pr-10 text-sm sm:h-10 sm:rounded-xl sm:pl-10 sm:pr-11 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/20 ${
                    errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isRedirecting}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 sm:right-3"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive sm:text-sm">{errors.password}</p>}
            </div>

            <div className="flex justify-end pt-0.5">
              {isLoading || isRedirecting ? (
                <span className="text-xs text-muted-foreground sm:text-sm">Forgot password?</span>
              ) : (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline sm:text-sm"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            {errors.submit && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive sm:text-sm">
                {errors.submit}
              </p>
            )}

            <SubmitButton
              loading={isLoading || isRedirecting}
              loadingLabel={isRedirecting ? "Please wait…" : "Signing in…"}
              className="h-9 w-full rounded-lg text-sm shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25 sm:h-10 sm:rounded-xl sm:text-base"
            >
              Sign in
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
