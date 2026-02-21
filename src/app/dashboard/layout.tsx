import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

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
    <div className="h-screen flex flex-col lg:flex-row bg-gradient-to-br from-muted/40 via-background to-muted/30 overflow-hidden">
      <AppSidebar user={user} />
      <main className="flex flex-col flex-1 min-w-0 min-h-0 lg:ml-64 overflow-hidden">
        <DashboardHeader user={user} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="container py-8 px-4 sm:px-6 lg:px-8 xl:px-10 max-w-7xl xl:max-w-[90rem]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
