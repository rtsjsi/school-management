import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { FileQuestion } from "lucide-react";
import { ExamsList } from "@/components/async/ExamsList";
import ExamMarksForm from "@/components/ExamMarksForm";
import MultipleSubjectwiseMarksEntry from "@/components/MultipleSubjectwiseMarksEntry";
import ReportCardGenerator from "@/components/ReportCardGenerator";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ academic_year_id?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const academicYearId = params.academic_year_id ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileQuestion className="h-7 w-7 text-primary" />
          Exam management
        </h1>
        <p className="text-muted-foreground mt-1">
          Create exams and record marks/grades.
        </p>
      </div>

      <Tabs defaultValue="exams" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 w-full overflow-x-auto">
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="marks">Record Marks</TabsTrigger>
          <TabsTrigger value="subjectwise">Subject-wise Marks</TabsTrigger>
          <TabsTrigger value="reportcard">Report Card</TabsTrigger>
        </TabsList>
        <TabsContent value="exams" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Suspense fallback={<TableSkeleton rows={3} columns={3} />}>
              <ExamsList academicYearId={academicYearId} />
            </Suspense>
          </div>
        </TabsContent>
        <TabsContent value="marks" className="space-y-6">
          <ExamMarksForm />
        </TabsContent>
        <TabsContent value="subjectwise" className="space-y-6">
          <MultipleSubjectwiseMarksEntry />
        </TabsContent>
        <TabsContent value="reportcard" className="space-y-6">
          <ReportCardGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
