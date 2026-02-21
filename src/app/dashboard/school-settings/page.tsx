import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SchoolSettingsPage() {
  redirect("/dashboard/administration?tab=settings");
}
