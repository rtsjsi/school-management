import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmployeeEntryForm from "@/components/EmployeeEntryForm";
import { EmployeeEditDialog } from "@/components/EmployeeEditDialog";
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

export async function EmployeesList() {
  const user = await getUser();
  if (!user) return null;
  if (!isAdminOrAbove(user)) return null;

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, employee_id, full_name, email, phone_number, role, department, designation, employee_type, joining_date, status, monthly_salary, shifts(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, name")
    .order("name");

  const canEdit = isAdminOrAbove(user);
  const shiftList = shifts ?? [];

  return (
    <>
      {canEdit && (
        <EmployeeEntryForm shifts={shiftList} />
      )}

      <Card>
        <CardContent className="pt-6">
          {employees && employees.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emp ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Status</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e) => {
                      const shiftData = e.shifts as { name?: string } | { name?: string }[] | null;
                      const shiftName = Array.isArray(shiftData) ? shiftData[0]?.name : shiftData?.name;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-xs">{e.employee_id ?? "—"}</TableCell>
                          <TableCell className="font-medium">{e.full_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{e.email ?? "—"}</TableCell>
                          <TableCell>{e.department ?? "—"}</TableCell>
                          <TableCell>{e.designation ?? "—"}</TableCell>
                          <TableCell>{shiftName ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={(e.status as string) === "active" ? "default" : "secondary"}>
                              {e.status ?? "active"}
                            </Badge>
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <EmployeeEditDialog employee={e} shifts={shiftList} />
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No employees yet. Add one using the form.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
