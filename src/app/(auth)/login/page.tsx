import { Suspense } from "react";
import { redirect } from "next/navigation";
import { canAccessDashboard, getUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getUser();
  if (user) {
    if (canAccessDashboard(user)) redirect("/dashboard");
    redirect("/no-dashboard-access");
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card p-8 shadow-lg text-center text-muted-foreground text-sm">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
