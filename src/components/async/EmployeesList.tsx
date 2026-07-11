import { getUser, isAdminOrAbove, isAuditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmployeeEntryForm from "@/components/EmployeeEntryForm";
import { EmployeesTable } from "@/components/EmployeesTable";
import { Card, CardContent } from "@/components/ui/card";

export async function EmployeesList() {
  const user = await getUser();
  if (!user) return null;
  if (!isAdminOrAbove(user) && !isAuditor(user)) return null;

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select(
      "id, employee_id, full_name, email, phone_number, address, aadhaar, pan, role, employee_type, joining_date, status, monthly_salary, degree, institution, year_passed, bank_name, account_number, ifsc_code, account_holder_name, shift_start_time, shift_end_time, biometric_enroll_no"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const canEdit = isAdminOrAbove(user);
  return (
    <>
      {canEdit && (
        <div className="flex justify-end mb-4">
          <EmployeeEntryForm />
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {employees && employees.length > 0 ? (
            <EmployeesTable employees={employees} canEdit={canEdit} />
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
