import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeesList } from "@/components/async/EmployeesList";
import { EmployeeDepartmentReport } from "@/components/EmployeeDepartmentReport";
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
          Employee Master
        </h1>
        <p className="text-muted-foreground mt-1">
          Employee directory, department reports, and management.
        </p>
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="department">Department Report</TabsTrigger>
        </TabsList>
        <TabsContent value="directory" className="space-y-6">
          <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
            <EmployeesList />
          </Suspense>
        </TabsContent>
        <TabsContent value="department" className="space-y-6">
          <Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
            <EmployeeDepartmentReport />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
