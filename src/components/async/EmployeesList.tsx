import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmployeeEntryForm from "@/components/EmployeeEntryForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export async function EmployeesList() {
  const user = await getUser();
  if (!user) return null;
  if (!isAdminOrAbove(user)) return null;

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, email, role, department, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
          <CardDescription>Create a new employee record.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeEntryForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>Latest employees. Add new via the form.</CardDescription>
        </CardHeader>
        <CardContent>
          {employees && employees.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{e.email ?? "—"}</TableCell>
                      <TableCell>{e.role}</TableCell>
                      <TableCell>{e.department ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {employees.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">Showing latest 10 employees</p>
              )}
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
