import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { GraduationCap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentEntryForm from "@/components/StudentEntryForm";
import { ManageStudentsList } from "@/components/ManageStudentsList";
import { AdmissionEnquiryForm } from "@/components/AdmissionEnquiryForm";
import { AdmissionEnquiryList } from "@/components/AdmissionEnquiryList";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const canEdit = isAdminOrAbove(user);
  const params = await searchParams;
  const tabParam = params.tab ?? (canEdit ? "add" : "manage");
  const defaultTab = ["add", "manage", "admission"].includes(tabParam) ? tabParam : (canEdit ? "add" : "manage");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          Student Master
        </h1>
        <p className="caption mt-1">
          {canEdit ? "Add new students, manage records, or track admission enquiries." : "View student records (read-only)."}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex flex-nowrap gap-1 w-full">
          {canEdit && (
            <TabsTrigger value="add">Add Student</TabsTrigger>
          )}
          <TabsTrigger value="manage">{canEdit ? "Manage Students" : "Students"}</TabsTrigger>
          {canEdit && (
            <TabsTrigger value="admission">Admission Enquiry</TabsTrigger>
          )}
        </TabsList>

        {canEdit && (
          <TabsContent value="add" className="space-y-6">
            <StudentEntryForm />
          </TabsContent>
        )}

        <TabsContent value="manage" className="space-y-6">
          <Suspense fallback={<TableSkeleton rows={8} columns={8} />}>
            <ManageStudentsList canEdit={canEdit} />
          </Suspense>
        </TabsContent>

        {canEdit && (
          <TabsContent value="admission" className="space-y-6">
            <AdmissionEnquiryForm />
            <Suspense fallback={<TableSkeleton rows={5} columns={5} />}>
              <AdmissionEnquiryList />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
