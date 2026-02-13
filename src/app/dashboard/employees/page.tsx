import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { UserPlus } from "lucide-react";
import { EmployeesList } from "@/components/async/EmployeesList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function EmployeesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserPlus className="h-7 w-7 text-primary" />
          Employees
        </h1>
        <p className="text-muted-foreground mt-1">
          Add and manage employees.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TableSkeleton rows={3} columns={3} />}>
          <EmployeesList />
        </Suspense>
      </div>
    </div>
  );
}
