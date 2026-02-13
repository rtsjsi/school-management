import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FileQuestion } from "lucide-react";
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

export default async function ExamsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, exam_type, subject, grade, held_at")
    .order("held_at", { ascending: false })
    .limit(100);

  const canEdit = isAdminOrAbove(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileQuestion className="h-7 w-7 text-primary" />
          Exam management
        </h1>
        <p className="text-muted-foreground mt-1">
          {canEdit
            ? "Create and manage exams (Admin & Super Admin)."
            : "View exam schedule (read-only)."}
        </p>
      </div>

      <div className={`grid gap-6 ${canEdit ? "lg:grid-cols-2" : ""}`}>
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>Add exam</CardTitle>
              <CardDescription>Create a new exam or assessment.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExamEntryForm />
            </CardContent>
          </Card>
        )}

        <Card className={canEdit ? "" : "lg:col-span-1"}>
          <CardHeader>
            <CardTitle>Exams</CardTitle>
            <CardDescription>
              {canEdit ? "All exams. Add new via the form." : "Read-only view."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exams && exams.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{exam.exam_type}</Badge>
                      </TableCell>
                      <TableCell>{exam.subject ?? "—"}</TableCell>
                      <TableCell>{exam.grade ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {exam.held_at ? new Date(exam.held_at).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {canEdit ? "No exams yet. Add one using the form." : "No exams yet."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
