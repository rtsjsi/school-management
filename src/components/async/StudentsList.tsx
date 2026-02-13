import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StudentEntryForm from "@/components/StudentEntryForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function StudentsList() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, email, grade, section, date_of_birth, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const canEdit = isAdminOrAbove(user);

  return (
    <>
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Add student</CardTitle>
            <CardDescription>Create a new student record.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentEntryForm />
          </CardContent>
        </Card>
      )}

      <Card className={canEdit ? "" : "lg:col-span-1"}>
        <CardHeader>
          <CardTitle>{canEdit ? "Students" : "Student list"}</CardTitle>
          <CardDescription>
            {canEdit ? "Latest students. Add new via the form." : "Read-only view."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students && students.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>DOB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                      <TableCell>{s.grade ?? "—"}</TableCell>
                      <TableCell>{s.section ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {students.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">Showing latest 10 students</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {canEdit ? "No students yet. Add one using the form." : "No students yet."}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
