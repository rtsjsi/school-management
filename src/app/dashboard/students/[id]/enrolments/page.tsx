import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StudentEnrolmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const { id: studentId } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, student_id")
    .eq("id", studentId)
    .single();

  if (!student) notFound();

  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("id, academic_year_id, standard_id, division_id, status, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const yearIds = [...new Set((enrollments ?? []).map((e) => e.academic_year_id))];
  const stdIds = [...new Set((enrollments ?? []).map((e) => e.standard_id))];
  const divIds = [...new Set((enrollments ?? []).map((e) => e.division_id))];

  const { data: years } = await supabase
    .from("academic_years")
    .select("id, name")
    .in("id", yearIds);
  const { data: standards } = await supabase
    .from("standards")
    .select("id, name")
    .in("id", stdIds);
  const { data: divisions } = await supabase
    .from("divisions")
    .select("id, name")
    .in("id", divIds);

  const yearMap = new Map((years ?? []).map((y) => [y.id, y.name]));
  const stdMap = new Map((standards ?? []).map((s) => [s.id, s.name]));
  const divMap = new Map((divisions ?? []).map((d) => [d.id, d.name]));

  const rows = (enrollments ?? []).map((e) => ({
    id: e.id,
    academicYear: yearMap.get(e.academic_year_id) ?? "—",
    standard: stdMap.get(e.standard_id) ?? "—",
    division: divMap.get(e.division_id) ?? "—",
    status: e.status,
    createdAt: e.created_at,
  }));

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">
            Enrolments — {student.full_name}
            {student.student_id && (
              <span className="font-mono text-sm font-normal text-muted-foreground ml-2">
                ({student.student_id})
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Read-only view of enrollment history.</p>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No enrolments found.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Standard</TableHead>
                    <TableHead>Division</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.academicYear}</TableCell>
                      <TableCell>{r.standard}</TableCell>
                      <TableCell>{r.division}</TableCell>
                      <TableCell className="capitalize">{r.status}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
