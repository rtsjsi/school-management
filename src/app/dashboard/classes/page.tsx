import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClassManagement } from "@/components/ClassManagement";
import { SubjectMaster } from "@/components/SubjectMaster";
export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");
  const { tab } = await searchParams;
  const defaultTab = tab === "subjects" ? "subjects" : "classes";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" />
          Class & Subject
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage classes, divisions, and subjects. Add or edit classes; max marks are set per exam.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="classes">Class</TabsTrigger>
          <TabsTrigger value="subjects">Subject</TabsTrigger>
        </TabsList>
        <TabsContent value="classes">
          <ClassManagement />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectMaster />
        </TabsContent>
      </Tabs>
    </div>
  );
}
