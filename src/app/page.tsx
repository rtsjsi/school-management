import type { Metadata } from "next";
import { getUser, canAccessDashboard } from "@/lib/auth";
import { getSchoolSettings } from "@/lib/school-settings";
import { HomeLandingPage } from "@/components/HomeLandingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home | School Management",
  description: "School management — sign in or continue to your school workspace.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getUser();

  let schoolName = "School Management";
  try {
    const settings = await getSchoolSettings();
    if (settings?.name?.trim()) {
      schoolName = settings.name.trim();
    }
  } catch {
    // RLS or network — keep default name
  }

  const fromParam = searchParams.from;
  const fromDashboard = fromParam === "dashboard" || (Array.isArray(fromParam) && fromParam.includes("dashboard"));

  const canUseDashboard = user ? canAccessDashboard(user) : false;
  const fromDashboardAttempt = Boolean(fromDashboard && user && !canUseDashboard);

  return (
    <HomeLandingPage
      user={user}
      schoolName={schoolName}
      fromDashboardAttempt={fromDashboardAttempt}
      canUseDashboard={canUseDashboard}
    />
  );
}
