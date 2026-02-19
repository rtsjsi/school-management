import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import StudentEntryForm from "@/components/StudentEntryForm";
import { StudentEditDialog } from "@/components/StudentEditDialog";
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

export async function StudentsList() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, student_id, full_name, email, phone_number, grade, section, roll_number, status, admission_date, date_of_birth, is_rte_quota, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const canEdit = isAdminOrAbove(user);

  // Status badge colors
  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      active: "default",
      inactive: "secondary",
      transferred: "outline",
      graduated: "secondary",
      suspended: "destructive",
    };
    return statusMap[status] || "default";
  };

  return (
    <>
      {canEdit && (
        <Card>
          <CardContent className="pt-6">
            <StudentEntryForm />
          </CardContent>
        </Card>
      )}

      <Card className={canEdit ? "" : "lg:col-span-1"}>
        <CardContent className="pt-6">
          {students && students.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Quota</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Roll #</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admission</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const studentData = s as typeof s & { status?: string; admission_date?: string };
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.student_id || "—"}
                          </TableCell>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell>
                            {(s as { is_rte_quota?: boolean }).is_rte_quota ? (
                              <Badge variant="secondary">RTE</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{s.email ?? "—"}</TableCell>
                          <TableCell>{s.grade ?? "—"}</TableCell>
                          <TableCell>{s.section ?? "—"}</TableCell>
                          <TableCell className="text-center">
                            {s.roll_number ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(studentData.status || "active")}>
                              {studentData.status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {studentData.admission_date 
                              ? new Date(studentData.admission_date).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <StudentEditDialog student={s} />
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {students.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  Showing latest {students.length} students
                </p>
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
