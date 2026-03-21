import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { InactivitySignOut } from "@/components/InactivitySignOut";

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
    <div className="flex min-h-0 h-[100dvh] max-h-[100dvh] flex-col overflow-hidden lg:flex-row bg-muted/30">
      <InactivitySignOut />
      <AppSidebar user={user} />
      <main className="flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden bg-background border-l border-border/80 lg:ml-64">
        <DashboardHeader user={user} />
        <div className="content-area flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden touch-pan-y">
          <div className="container w-full min-w-0 max-w-7xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8 xl:max-w-[90rem] xl:px-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
