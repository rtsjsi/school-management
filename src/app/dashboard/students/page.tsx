import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { ManageStudentsList } from "@/components/ManageStudentsList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function StudentsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const canEdit = isAdminOrAbove(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Student Master
        </h1>
        <p className="caption mt-1">
          {canEdit ? "Add new students or manage student records." : "View student records (read-only)."}
        </p>
      </div>

      <Suspense fallback={<TableSkeleton rows={8} columns={8} />}>
        <ManageStudentsList canEdit={canEdit} />
      </Suspense>
    </div>
  );
}
