import { redirect } from "next/navigation";
import { getUser, isPrincipal } from "@/lib/auth";
import { CalendarRange } from "lucide-react";
import { AcademicYearsManager } from "@/components/AcademicYearsManager";

export default async function AcademicYearsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isPrincipal(user)) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CalendarRange className="h-7 w-7 text-primary" />
          Academic Year
        </h1>
        <p className="text-muted-foreground mt-1">
          Set the current academic year and manage years. Only Principal can change the current year.
        </p>
      </div>
      <AcademicYearsManager />
    </div>
  );
}
