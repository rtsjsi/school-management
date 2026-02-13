import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ExamEntryForm from "@/components/ExamEntryForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export async function ExamsList() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, subject, grade, held_at")
    .order("held_at", { ascending: false })
    .limit(10);

  const canEdit = isAdminOrAbove(user);

  return (
    <>
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Add exam</CardTitle>
            <CardDescription>Create exam.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExamEntryForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Exams</CardTitle>
          <CardDescription>
            {canEdit ? "Latest exams. Add new via form." : "Read-only view."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exams && exams.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{exam.exam_type}</Badge>
                      </TableCell>
                      <TableCell>{exam.held_at ? new Date(exam.held_at).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-4">Latest 10</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No exams</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
