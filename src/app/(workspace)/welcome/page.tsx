import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { AppWelcomePage } from "@/components/AppWelcomePage";

/** Fresh render so rotating thank-you messages stay per-visit, not cached. */
export const dynamic = "force-dynamic";

/**
 * In-app welcome — first screen after sign-in for everyone.
 * Stats overview lives at /dashboard.
 */
export default async function WelcomePage() {
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
