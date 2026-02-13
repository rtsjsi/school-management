import { redirect } from "next/navigation";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserPlus } from "lucide-react";
import EmployeeEntryForm from "@/components/EmployeeEntryForm";

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
    <div>
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <UserPlus className="h-7 w-7" />
        Employees
      </h1>
      <p className="text-muted-foreground mt-1">
        Add and manage employees (Admin & Super Admin only).
      </p>

      <div className="mt-8 grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add employee</h2>
          <EmployeeEntryForm />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent employees</h2>
          {employees && employees.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {employees.map((e) => (
                <li key={e.id} className="py-3 first:pt-0">
                  <div className="font-medium text-foreground">{e.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {e.email && <span>{e.email}</span>}
                    <span> · {e.role}</span>
                    {e.department && <span> · {e.department}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No employees yet. Add one using the form.</p>
          )}
        </div>
      </div>
    </div>
  );
}
