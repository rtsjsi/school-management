import { redirect } from "next/navigation";
import { getUser, canAccessFees, canEditFees } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeeStructureForm from "@/components/FeeStructureForm";
import { FeeStructureListWithFilters } from "@/components/FeeStructureListWithFilters";
import FeeCollectionForm from "@/components/FeeCollectionForm";
import FeeCollectionList from "@/components/FeeCollectionList";
import OutstandingReport from "@/components/OutstandingReport";
import FeeCollectionReport from "@/components/FeeCollectionReport";
import { createClient } from "@/lib/supabase/server";

export default async function FeesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!canAccessFees(user)) redirect("/welcome");

  const supabase = await createClient();
  const { data: allStudents } = await supabase
    .from("students")
    .select("id, full_name, standard, division, roll_number, gr_number, is_rte_quota, fee_concession_amount")
    .eq("status", "active")
    .order("full_name");
  const students = (allStudents ?? []).filter((s) => !(s as { is_rte_quota?: boolean }).is_rte_quota);

  const canEdit = canEditFees(user);

  return (
    <div className="space-y-3 sm:space-y-4">
      <Tabs defaultValue="collection" className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-nowrap gap-1 w-full">
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="space-y-4 sm:space-y-6">
          {canEdit && students && students.length > 0 && (
            <FeeCollectionForm
              students={students}
              collectorProfileId={user.id}
              collectorFullName={user.fullName ?? user.email ?? "Staff"}
            />
          )}
          {canEdit && students && students.length === 0 && (
            <p className="text-sm text-muted-foreground">Add students first to collect fees.</p>
          )}
          <FeeCollectionList />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 sm:space-y-6">
          <Tabs defaultValue="collection-report" className="space-y-3 sm:space-y-4">
            <TabsList className="flex flex-nowrap gap-1 w-full">
              <TabsTrigger value="collection-report">
                Collection Report
              </TabsTrigger>
              <TabsTrigger value="outstanding-report">
                Outstanding Report
              </TabsTrigger>
            </TabsList>
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              Choose a report type to generate and analyze fee data.
            </p>
            <TabsContent value="collection-report" className="space-y-4 sm:space-y-6">
              <FeeCollectionReport />
            </TabsContent>
            <TabsContent value="outstanding-report" className="space-y-4 sm:space-y-6">
              <OutstandingReport />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="structure" className="space-y-4 sm:space-y-6">
          {canEdit && <FeeStructureForm />}
          <FeeStructureListWithFilters canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
