import { redirect } from "next/navigation";
import { canAccessDashboard, getUser } from "@/lib/auth";
import NoDashboardAccessCard from "@/components/NoDashboardAccessCard";

export default async function NoDashboardAccessPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  if (canAccessDashboard(user)) {
    redirect("/dashboard");
  }

  return <NoDashboardAccessCard />;
}
