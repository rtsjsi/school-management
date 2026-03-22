import { redirect } from "next/navigation";
import { canAccessDashboard, getUser } from "@/lib/auth";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const user = await getUser();
  if (user) {
    if (canAccessDashboard(user)) redirect("/dashboard");
    redirect("/no-dashboard-access");
  }

  return <ForgotPasswordForm />;
}
