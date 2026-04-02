import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { guardAcademicAndStudentModules } from "@/lib/dashboard-guards";
import { shouldApplyClassFilter, getAllowedClassNames } from "@/lib/class-access";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManageStudentsList } from "@/components/ManageStudentsList";
import { StudentReports } from "@/components/StudentReports";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function StudentsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  guardAcademicAndStudentModules(user);

  const canEdit = isAdminOrAbove(user);
  const applyClassFilter = shouldApplyClassFilter(user);
  const allowedClassNames = applyClassFilter ? (await getAllowedClassNames(user.id)) ?? [] : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Tabs defaultValue="students" className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-nowrap gap-1 w-full">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          <Suspense fallback={<TableSkeleton rows={8} columns={8} />}>
            <ManageStudentsList canEdit={canEdit} allowedClassNames={allowedClassNames ?? undefined} />
          </Suspense>
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          <StudentReports allowedClassNames={allowedClassNames ?? undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
