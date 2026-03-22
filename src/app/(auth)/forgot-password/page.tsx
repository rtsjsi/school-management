import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const user = await getUser();
  if (user) redirect("/");

  return <ForgotPasswordForm />;
}
