import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { CalendarRange } from "lucide-react";
import { FinancialYearsManager } from "@/components/FinancialYearsManager";

export default async function FinancialYearsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CalendarRange className="h-7 w-7 text-primary" />
          Financial Year
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage financial/academic years for dropdowns (e.g. 2024-2025).
        </p>
      </div>
      <FinancialYearsManager />
    </div>
  );
}
