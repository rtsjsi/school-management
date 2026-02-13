import { createClient } from "@/lib/supabase/server";
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

export async function OutstandingFeesList() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: fees } = await supabase
    .from("fees")
    .select("id, amount, paid_amount, fee_type, status, due_date, students(full_name, grade, section)")
    .or(`status.eq.pending,status.eq.overdue,status.eq.partial`)
    .order("due_date", { ascending: true })
    .limit(50);

  const defaulters = (fees ?? []).map((f) => {
    const student = Array.isArray(f.students) ? f.students[0] : f.students;
    const paid = Number((f as { paid_amount?: number }).paid_amount ?? 0);
    const total = Number(f.amount);
    const outstanding = total - paid;
    const isOverdue = f.due_date && f.due_date < today;
    return {
      ...f,
      student,
      outstanding,
      isOverdue,
    };
  }).filter((d) => d.outstanding > 0);

  if (!defaulters.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outstanding / Defaulter List</CardTitle>
          <CardDescription>No outstanding fees.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All fees are up to date.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding / Defaulter List</CardTitle>
        <CardDescription>
          Students with pending or overdue fees ({defaulters.length} records).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {defaulters.map((d) => {
              const s = d.student as { full_name?: string; grade?: string; section?: string } | null;
              const total = Number(d.amount);
              const paid = Number((d as { paid_amount?: number }).paid_amount ?? 0);
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{s?.full_name ?? "—"}</TableCell>
                  <TableCell>{s?.grade ?? "—"} {s?.section ?? ""}</TableCell>
                  <TableCell className="capitalize">{d.fee_type}</TableCell>
                  <TableCell>{d.due_date ? new Date(d.due_date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{total.toLocaleString()}</TableCell>
                  <TableCell>{paid.toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{d.outstanding.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={d.isOverdue ? "destructive" : "secondary"}>
                      {d.isOverdue ? "Overdue" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
