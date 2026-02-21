import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardUserMenu } from "@/components/DashboardUserMenu";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/30">
      <AppSidebar user={user} />
      <main className="lg:ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b border-border/80 bg-card/80 backdrop-blur px-4 sm:px-6 lg:px-8 shrink-0">
          <DashboardUserMenu user={user} />
        </header>
        <div className="container py-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
