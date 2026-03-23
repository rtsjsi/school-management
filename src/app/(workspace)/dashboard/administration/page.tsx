import { redirect } from "next/navigation";
import { getUser, isPrincipal } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getSchoolSettingsWithUrls } from "@/lib/school-settings";
import { AdministrationTabs } from "@/components/AdministrationTabs";

export const dynamic = "force-dynamic";

export default async function AdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isPrincipal(user)) redirect("/welcome");

  const params = await searchParams;
  const tab = params.tab ?? "users";
  const validTab = ["users", "settings", "academic-year"].includes(tab) ? tab : "users";

  const admin = createAdminClient();
  const profiles = admin
    ? (await admin.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false })).data ?? []
    : [];
  const initialSettings = await getSchoolSettingsWithUrls();

  return (
    <div className="space-y-8">
      <AdministrationTabs
        defaultTab={validTab}
        profiles={profiles as { id: string; email: string | null; full_name: string | null; role: string | null; created_at: string }[]}
        initialSettings={initialSettings}
        isPrincipal={isPrincipal(user)}
      />
    </div>
  );
}
