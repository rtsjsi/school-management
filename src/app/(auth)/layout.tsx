import type { Metadata } from "next";
import { AuthBrandingPanel } from "@/components/AuthBrandingPanel";

export const metadata: Metadata = {
  title: "Authentication | School Management",
  description: "Login to School Management",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background lg:flex-row">
      <AuthBrandingPanel />
      <AuthBrandingPanel compact />
      <main className="relative flex min-h-0 flex-1 flex-col justify-center overflow-y-auto overflow-x-hidden bg-gradient-to-b from-muted/40 via-background to-background px-4 py-3 sm:px-6 sm:py-4 lg:h-dvh lg:max-h-dvh lg:overflow-y-auto lg:py-6">
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_30%,#000_50%,transparent)]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
