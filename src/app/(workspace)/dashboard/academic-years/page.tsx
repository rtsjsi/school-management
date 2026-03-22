import { redirect } from "next/navigation";

export default async function AcademicYearsPage() {
  redirect("/dashboard/administration?tab=academic-year");
}
