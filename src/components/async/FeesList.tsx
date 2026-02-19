import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import FeeEntryForm from "@/components/FeeEntryForm";
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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
  partial: "outline",
};

export async function FeesList() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: fees } = await supabase
    .from("fees")
    .select("id, amount, fee_type, status, due_date, paid_at, students(full_name)")
    .order("due_date", { ascending: false })
    .limit(10);

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .order("full_name");

  const canEdit = isAdminOrAbove(user);

  return (
    <>
      {canEdit && students && students.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <FeeEntryForm students={students} />
          </CardContent>
        </Card>
      )}
      {canEdit && students && students.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Add students first to record fees.</p>
          </CardContent>
        </Card>
      )}

      <Card className={canEdit ? "" : "lg:col-span-1"}>
        <CardContent className="pt-6">
          {fees && fees.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {Array.isArray(f.students)
                          ? (f.students[0] as { full_name?: string })?.full_name ?? "—"
                          : (f.students as { full_name?: string } | null)?.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="capitalize">{f.fee_type}</TableCell>
                      <TableCell>{Number(f.amount).toLocaleString()}</TableCell>
                      <TableCell>
                        {f.due_date ? new Date(f.due_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[f.status] ?? "secondary"}>{f.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {fees.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">Showing latest 10</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No fees yet</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
