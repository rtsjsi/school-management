import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getUser, canViewFinance } from "@/lib/auth";
import { Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ShiftForm from "@/components/ShiftForm";
import HolidayForm from "@/components/HolidayForm";
import AttendanceManualForm from "@/components/AttendanceManualForm";
import { createClient } from "@/lib/supabase/server";
import { ShiftList } from "@/components/ShiftList";
import { HolidayList } from "@/components/HolidayList";
import { AttendanceDailyRegister } from "@/components/AttendanceDailyRegister";
import AttendanceReports from "@/components/AttendanceReports";
import AttendanceReviewAndApprove from "@/components/AttendanceReviewAndApprove";
import NEFTGeneration from "@/components/NEFTGeneration";
import PayslipGenerator from "@/components/PayslipGenerator";
import SalaryDeductionsManager from "@/components/SalaryDeductionsManager";
import { EmployeesList } from "@/components/async/EmployeesList";
import { EmployeeDepartmentReport } from "@/components/EmployeeDepartmentReport";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export default async function PayrollPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!canViewFinance(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name")
    .eq("status", "active")
    .order("full_name");

  const empList = employees ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Wallet className="h-7 w-7 text-primary" />
          Payroll
        </h1>
        <p className="text-muted-foreground mt-1">
          Employees, shifts, holidays, attendance, payslips, and NEFT.
        </p>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex flex-nowrap w-max min-w-full justify-start gap-1">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="shifts">Shifts</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="review">Review & Approve</TabsTrigger>
            <TabsTrigger value="neft">NEFT File</TabsTrigger>
            <TabsTrigger value="payslips">Payslips</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="employees" className="space-y-6">
          <Tabs defaultValue="directory" className="space-y-6">
            <TabsList className="flex flex-nowrap gap-1 w-full">
              <TabsTrigger value="directory">Directory</TabsTrigger>
              <TabsTrigger value="department">Department Report</TabsTrigger>
            </TabsList>
            <TabsContent value="directory" className="space-y-6">
              <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
                <EmployeesList />
              </Suspense>
            </TabsContent>
            <TabsContent value="department" className="space-y-6">
              <Suspense fallback={<TableSkeleton rows={5} columns={4} />}>
                <EmployeeDepartmentReport />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          <ShiftForm />
          <Suspense fallback={<TableSkeleton rows={3} columns={4} />}>
            <ShiftList />
          </Suspense>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-6">
          <HolidayForm />
          <Suspense fallback={<TableSkeleton rows={5} columns={3} />}>
            <HolidayList />
          </Suspense>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-1">
            <AttendanceManualForm employees={empList} />
          </div>
          <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
            <AttendanceDailyRegister />
          </Suspense>
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <AttendanceReviewAndApprove />
        </TabsContent>

        <TabsContent value="neft" className="space-y-6">
          <NEFTGeneration />
        </TabsContent>

        <TabsContent value="payslips" className="space-y-6">
          <PayslipGenerator />
          <SalaryDeductionsManager />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AttendanceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}
