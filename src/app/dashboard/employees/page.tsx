import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserPlus } from "lucide-react";
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

export default async function EmployeesPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminOrAbove(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, email, role, department, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserPlus className="h-7 w-7 text-primary" />
          Employees
        </h1>
        <p className="text-muted-foreground mt-1">
          Add and manage employees (Admin & Super Admin only).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
            <CardDescription>All employees. Add new via the form.</CardDescription>
          </CardHeader>
          <CardContent>
            {employees && employees.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No employees yet. Add one using the form.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
