import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYearId } from "@/lib/enrollment";
import ExamEntryForm from "@/components/ExamEntryForm";
import { ExamEditDialog } from "@/components/ExamEditDialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function ExamsList() {
  const user = await getUser();
  if (!user) return null;

  const activeYearId = await getActiveAcademicYearId();
  const supabase = await createClient();
  let query = supabase
    .from("exams")
    .select("id, name, standard, term")
    .order("created_at", { ascending: false });
  if (activeYearId) query = query.eq("academic_year_id", activeYearId);
  const { data: exams } = await query;

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
          {exams && exams.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam name</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Term</TableHead>
                    {canEdit && <TableHead className="w-24">Edit</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>{exam.standard ?? "—"}</TableCell>
                      <TableCell>{exam.term ?? "—"}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <ExamEditDialog
                            exam={{
                              id: exam.id,
                              name: exam.name,
                              standard: exam.standard,
                              term: exam.term ?? null,
                            }}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">Current academic year exams</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No exams in the current academic year.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
