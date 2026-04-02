import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { guardAcademicAndStudentModules } from "@/lib/dashboard-guards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassManagement } from "@/components/ClassManagement";
import { SubjectMaster } from "@/components/SubjectMaster";
import { PromotionRunner } from "@/components/PromotionRunner";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function AcademicSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  guardAcademicAndStudentModules(user);

  const params = await searchParams;
  const canPromote = isAdminOrAbove(user);
  const tabParam = params.tab ?? "standards";
  const validTabs = ["standards", "subjects", ...(canPromote ? ["promotion"] : [])];
  const tab = validTabs.includes(tabParam) ? tabParam : "standards";

  return (
    <div className="space-y-6 sm:space-y-8">
      <Tabs defaultValue={tab} className="space-y-4 sm:space-y-6">
        <TabsList className="flex flex-nowrap gap-1 w-full">
          <TabsTrigger value="standards">Standards</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          {canPromote && (
            <TabsTrigger value="promotion">Promotion</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="standards" className="space-y-6">
          <ClassManagement />
        </TabsContent>
        <TabsContent value="subjects" className="space-y-6">
          <Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
            <SubjectMaster />
          </Suspense>
        </TabsContent>
        {canPromote && (
          <TabsContent value="promotion" className="space-y-6">
            <PromotionRunner />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
