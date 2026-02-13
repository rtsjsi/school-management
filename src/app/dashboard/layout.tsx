import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AppSidebar } from "@/components/AppSidebar";

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
    <div className="min-h-screen bg-muted/30">
      <AppSidebar user={user} />
      <main className="lg:ml-64 min-h-screen">
        <div className="container py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
