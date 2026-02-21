import { redirect } from "next/navigation";

export default async function ClassesPage() {
  redirect("/dashboard/academic-setup?tab=standards");
}
