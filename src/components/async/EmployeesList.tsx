import { getUser, isAdminOrAbove, isAuditor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import EmployeeEntryForm from "@/components/EmployeeEntryForm";
import { EmployeesTable } from "@/components/EmployeesTable";
import { Card, CardContent } from "@/components/ui/card";
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
      "id, employee_id, full_name, email, phone_number, address, aadhaar, pan, role, department, employee_type, joining_date, status, monthly_salary, degree, institution, year_passed, bank_name, account_number, ifsc_code, account_holder_name, shift_id, shifts(name)"
    )
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
            <EmployeesTable employees={employees} shiftList={shiftList} canEdit={canEdit} />
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
