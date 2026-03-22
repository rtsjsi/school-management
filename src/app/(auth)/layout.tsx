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
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background lg:min-h-screen lg:flex-row">
      <AuthBrandingPanel />
      <AuthBrandingPanel compact />
      <main className="relative flex min-h-0 flex-1 flex-col justify-center bg-gradient-to-b from-muted/40 via-background to-background px-4 py-10 sm:px-8 lg:min-h-screen lg:py-14">
        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_30%,#000_50%,transparent)]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto w-full max-w-[420px] py-1">{children}</div>
      </main>
    </div>
  );
}
