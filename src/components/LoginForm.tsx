"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
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
    setErrors((prev) => ({ ...prev, submit: undefined }));

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrors((prev) => ({ ...prev, submit: error.message }));
        return;
      }

      if (data.user) {
        router.push("/dashboard");
        router.refresh();
      }
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
            <LogIn className="h-7 w-7" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-balance text-3xl font-bold tracking-tight">Sign in</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Enter your credentials to open your dashboard.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pb-8 pt-2">
          {bannerMessage && (
            <p
              role="status"
              className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                searchParams.get("error") === "auth"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
              }`}
            >
              {bannerMessage}
            </p>
          )}
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
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  placeholder="you@school.edu"
                  className={`h-11 rounded-xl border-border/80 bg-background/80 pl-10 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/20 ${
                    errors.email ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`h-11 rounded-xl border-border/80 bg-background/80 pl-10 pr-11 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-primary/20 ${
                    errors.password ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {errors.submit && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errors.submit}
              </p>
            )}

            <SubmitButton
              loading={isLoading}
              loadingLabel="Signing in…"
              className="h-11 w-full rounded-xl text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              Sign in
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        Protected sign-in. If you need access, ask your school administrator.
      </p>
    </div>
  );
}
