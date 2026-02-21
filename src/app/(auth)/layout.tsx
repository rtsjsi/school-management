import type { Metadata } from "next";

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
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
