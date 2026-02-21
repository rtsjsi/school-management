import { Suspense } from "react";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ExamEntryForm from "@/components/ExamEntryForm";
import { ExamSubjectsConfig } from "@/components/ExamSubjectsConfig";
import { ExamYearFilter } from "@/components/ExamYearFilter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchAcademicYears } from "@/lib/lov";

type ExamsListProps = { academicYearId?: string | null };

export async function ExamsList({ academicYearId }: ExamsListProps) {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  let query = supabase
    .from("exams")
    .select("id, name, exam_type, subject, grade, held_at, academic_years(id, name)")
    .order("held_at", { ascending: false })
    .limit(50);
  if (academicYearId) query = query.eq("academic_year_id", academicYearId);
  const { data: exams } = await query;

  const academicYears = await fetchAcademicYears();
  const canEdit = isAdminOrAbove(user);

  return (
    <>
      {canEdit && (
        <Card>
          <CardContent className="pt-6">
            <ExamEntryForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <Suspense fallback={null}>
              <ExamYearFilter years={academicYears} />
            </Suspense>
          </div>
          {exams && exams.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Academic year</TableHead>
                    <TableHead>Start date</TableHead>
                    {canEdit && <TableHead className="w-32">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{exam.exam_type}</Badge>
                      </TableCell>
                      <TableCell>
                        {(exam.academic_years as { name?: string } | null)?.name ?? "—"}
                      </TableCell>
                      <TableCell>{exam.held_at ? new Date(exam.held_at).toLocaleDateString() : "—"}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <ExamSubjectsConfig exam={{ id: exam.id, name: exam.name, grade: exam.grade }} />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">
                {academicYearId ? "Exams in selected year" : "Latest 50"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {academicYearId ? "No exams in this academic year." : "No exams."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
