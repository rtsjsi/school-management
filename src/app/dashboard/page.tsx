import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { AppWelcomePage } from "@/components/AppWelcomePage";

/**
 * In-app home / welcome — first screen after sign-in for everyone.
 * The statistics “Dashboard” lives at /dashboard/overview like any other module.
 */
export default async function DashboardHomePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  let schoolName = "School Management";
  try {
    const settings = await getSchoolSettings();
    if (settings?.name?.trim()) {
      schoolName = settings.name.trim();
    }
  } catch {
    // RLS or network — keep default name
  }

  return <AppWelcomePage user={user} schoolName={schoolName} />;
}
