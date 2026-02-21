import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import StudentEntryForm from "@/components/StudentEntryForm";
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
          {canEdit ? "Add new students or manage existing records." : "View student records (read-only)."}
        </p>
      </div>

      <Tabs defaultValue={canEdit ? "add" : "manage"} className="space-y-6">
        <TabsList>
          {canEdit && (
            <TabsTrigger value="add">Add Student</TabsTrigger>
          )}
          <TabsTrigger value="manage">{canEdit ? "Manage Students" : "Students"}</TabsTrigger>
        </TabsList>

        {canEdit && (
          <TabsContent value="add" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <StudentEntryForm />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="manage" className="space-y-6">
          <Suspense fallback={<TableSkeleton rows={8} columns={8} />}>
            <ManageStudentsList canEdit={canEdit} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
