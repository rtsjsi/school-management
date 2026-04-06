import { getUser, isAdminOrAbove, isAuditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmployeeEntryForm from "@/components/EmployeeEntryForm";
import { EmployeeEditDialog } from "@/components/EmployeeEditDialog";
import { EmployeesExportButtons } from "@/components/EmployeesExportButtons";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";

export async function EmployeesList() {
  const user = await getUser();
  if (!user) return null;
  if (!isAdminOrAbove(user) && !isAuditor(user)) return null;

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select(
      "id, employee_id, full_name, email, phone_number, address, aadhaar, pan, role, department, employee_type, joining_date, status, monthly_salary, degree, institution, year_passed, bank_name, account_number, ifsc_code, account_holder_name, shifts(name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, name")
    .order("name");

  const canEdit = isAdminOrAbove(user);
  const shiftList = shifts ?? [];
  const exportRows = (employees ?? []).map((e) => {
    const shiftData = e.shifts as { name?: string } | { name?: string }[] | null;
    const shiftName = Array.isArray(shiftData) ? shiftData[0]?.name : shiftData?.name;
    return {
      employee_id: e.employee_id ?? "—",
      full_name: e.full_name ?? "—",
      email: e.email ?? "—",
      department: e.department ?? "—",
      shift: shiftName ?? "—",
      status: String(e.status ?? "active"),
    };
  });

  return (
    <>
      {canEdit && (
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <UserPlus className="h-4 w-4" />
                Add employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-base">Add new employee</DialogTitle>
                <DialogDescription>
                  Fill in the form to create a new employee record.
                </DialogDescription>
              </DialogHeader>
              <EmployeeEntryForm shifts={shiftList} />
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {employees && employees.length > 0 ? (
            <>
              <div className="mb-3 flex justify-end">
                <EmployeesExportButtons rows={exportRows} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emp ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
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
