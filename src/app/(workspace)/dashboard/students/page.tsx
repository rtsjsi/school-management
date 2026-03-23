import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { guardAcademicAndStudentModules } from "@/lib/dashboard-guards";
import { shouldApplyClassFilter, getAllowedClassNames } from "@/lib/class-access";
import { ManageStudentsList } from "@/components/ManageStudentsList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function StudentsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  guardAcademicAndStudentModules(user);

  const canEdit = isAdminOrAbove(user);
  const applyClassFilter = shouldApplyClassFilter(user);
  const allowedClassNames = applyClassFilter ? (await getAllowedClassNames(user.id)) ?? [] : null;

  return (
    <div className="space-y-8">
      <Suspense fallback={<TableSkeleton rows={8} columns={8} />}>
        <ManageStudentsList canEdit={canEdit} allowedClassNames={allowedClassNames ?? undefined} />
      </Suspense>
    </div>
  );
}
