import { redirect } from "next/navigation";

export default async function SubjectsPage() {
  redirect("/dashboard/academic-setup?tab=subjects");
}
