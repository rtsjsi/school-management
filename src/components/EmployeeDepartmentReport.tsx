import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function EmployeeDepartmentReport() {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, employee_id, department, designation, role")
    .eq("status", "active")
    .order("department")
    .order("full_name");

  const byDept = (employees ?? []).reduce((acc: Record<string, { full_name: string; employee_id?: string; designation?: string; role?: string }[]>, e) => {
    const dept = e.department?.trim() || "Unassigned";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push({
      full_name: e.full_name,
      employee_id: e.employee_id ?? undefined,
      designation: e.designation ?? undefined,
      role: e.role ?? undefined,
    });
    return acc;
  }, {});

  const depts = Object.keys(byDept).sort();

  return (
    <Card>
      <CardContent className="pt-6">
        {depts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Emp ID</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depts.map((dept) =>
                byDept[dept].map((emp, i) => (
                  <TableRow key={`${dept}-${i}`}>
                    <TableCell className={i === 0 ? "font-medium" : ""}>{i === 0 ? dept : ""}</TableCell>
                    <TableCell>{emp.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{emp.employee_id ?? "—"}</TableCell>
                    <TableCell>{emp.designation ?? "—"}</TableCell>
                    <TableCell>{emp.role ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No employees.</p>
        )}
      </CardContent>
    </Card>
  );
}
