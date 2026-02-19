import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import FeeStructureForm from "@/components/FeeStructureForm";
import { FeeStructureList } from "@/components/FeeStructureList";
import FeeCollectionForm from "@/components/FeeCollectionForm";
import { OutstandingFeesList } from "@/components/OutstandingFeesList";
import FeeCollectionReport from "@/components/FeeCollectionReport";
import { createClient } from "@/lib/supabase/server";

export default async function FeesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: allStudents } = await supabase
    .from("students")
    .select("id, full_name, grade, section, roll_number, student_id, is_rte_quota")
    .eq("status", "active")
    .order("full_name");
  const students = (allStudents ?? []).filter((s) => !(s as { is_rte_quota?: boolean }).is_rte_quota);

  const canEdit = isAdminOrAbove(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          Fees Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Fee structures, collection, outstanding tracking, and reports.
        </p>
      </div>

      <Tabs defaultValue="structure" className="space-y-6">
        <TabsList>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
          <TabsTrigger value="collection">Fee Collection</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-6">
          {canEdit && <FeeStructureForm />}
          <Suspense fallback={<TableSkeleton rows={3} columns={4} />}>
            <FeeStructureList canEdit={canEdit} />
          </Suspense>
        </TabsContent>

        <TabsContent value="collection" className="space-y-6">
          {canEdit && students && students.length > 0 && (
            <FeeCollectionForm students={students} receivedBy={user.fullName ?? user.email ?? "Staff"} />
          )}
          {canEdit && students && students.length === 0 && (
            <p className="text-sm text-muted-foreground">Add students first to collect fees.</p>
          )}
        </TabsContent>

        <TabsContent value="outstanding" className="space-y-6">
          <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
            <OutstandingFeesList />
          </Suspense>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <FeeCollectionReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
