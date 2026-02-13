import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DollarSign } from "lucide-react";
import FeeEntryForm from "@/components/FeeEntryForm";
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

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive",
  partial: "outline",
};

export default async function FeesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: fees } = await supabase
    .from("fees")
    .select("id, amount, fee_type, status, due_date, paid_at, students(full_name)")
    .order("due_date", { ascending: false })
    .limit(100);

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .order("full_name");

  const canEdit = isAdminOrAbove(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          Fees management
        </h1>
        <p className="text-muted-foreground mt-1">
          {canEdit
            ? "Add and manage student fees (Admin & Super Admin)."
            : "View fee records (read-only)."}
        </p>
      </div>

      <div className={`grid gap-6 ${canEdit ? "lg:grid-cols-2" : ""}`}>
        {canEdit && students && students.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Add fee</CardTitle>
              <CardDescription>Record a new fee for a student.</CardDescription>
            </CardHeader>
            <CardContent>
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
          <CardHeader>
            <CardTitle>Fees</CardTitle>
            <CardDescription>
              {canEdit ? "All fee records. Add new via the form." : "Read-only view."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fees && fees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {Array.isArray(f.students)
  ? (f.students[0] as { full_name?: string } | undefined)?.full_name ?? "—"
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
                      <TableCell className="text-muted-foreground">
                        {f.paid_at ? new Date(f.paid_at).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {canEdit ? "No fees yet. Add one using the form." : "No fees yet."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
