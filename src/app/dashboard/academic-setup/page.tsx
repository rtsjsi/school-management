import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { BookOpen } from "lucide-react";
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

  const params = await searchParams;
  const canPromote = isAdminOrAbove(user);
  const tabParam = params.tab ?? "standards";
  const validTabs = ["standards", "subjects", ...(canPromote ? ["promotion"] : [])];
  const tab = validTabs.includes(tabParam) ? tabParam : "standards";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Academic setup
        </h1>
        <p className="caption mt-1">
          Standards, subjects, and year-end promotion.
        </p>
      </div>

      <Tabs defaultValue={tab} className="space-y-6">
        <TabsList className="flex flex-nowrap gap-1 w-full">
          <TabsTrigger value="standards">Standard management</TabsTrigger>
          <TabsTrigger value="subjects">Subject management</TabsTrigger>
          {canPromote && (
            <TabsTrigger value="promotion">Year-end promotion</TabsTrigger>
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
