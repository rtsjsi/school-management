import { redirect } from "next/navigation";
import { getUser, isPrincipal } from "@/lib/auth";
import { getSchoolSettingsWithUrls } from "@/lib/school-settings";
import { SchoolSettingsForm } from "@/components/SchoolSettingsForm";
import { Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SchoolSettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isPrincipal(user)) redirect("/dashboard");

  const initialSettings = await getSchoolSettingsWithUrls();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          School settings
        </h1>
        <p className="text-muted-foreground mt-1">
          School name, logo, principal signature, and contact. Used on receipts, report cards, and documents.
        </p>
      </div>

      <SchoolSettingsForm initialSettings={initialSettings} isPrincipal={isPrincipal(user)} />
    </div>
  );
}
