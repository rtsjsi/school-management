import { redirect } from "next/navigation";
import { getUser, canViewFinance, isAccounts, isPayrollRole, canAccessFees, canAccessPayroll } from "@/lib/auth";
import { shouldApplyClassFilter, getStudentIdsForAllowedClasses } from "@/lib/class-access";
import { createClient } from "@/lib/supabase/server";
import { computeOverallCompleteness } from "@/lib/student-completeness";
import {
  aggregateCompleteness,
  computeEmployeeCompleteness,
  computeStandardCompleteness,
  computeSubjectCompleteness,
} from "@/lib/master-data-completeness";
import { fetchDashboardData } from "./queries";
import { AcademicSection } from "./components/AcademicSection";
import { FinanceSection } from "./components/FinanceSection";
import { OutstandingFeesSection } from "./components/OutstandingFeesSection";
import { PayrollSection } from "./components/PayrollSection";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const applyClassFilter = shouldApplyClassFilter(user);
  const allowedStudentIds = applyClassFilter ? await getStudentIdsForAllowedClasses(user.id) : null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const monthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("name, start_date, end_date")
    .eq("status", "active")
    .maybeSingle();
  const activeYearName = activeYear?.name ?? null;

  const {
    studentsCount,
    activeStudentsCount,
    employeesCount,
    rteStudentsCount,
    newAdmissionsCount,
    feeCollected,
    expensesThisMonth,
    outstandingCurrentYear,
    totalFeesCurrentYear,
    totalPaidCurrentYear,
    outstandingByQuarter,
    collectionsByQuarter,
    activeStudentsFullResult,
    standardsMasterResult,
    subjectsMasterResult,
    employeesMasterResult,
  } = await fetchDashboardData(user, activeYearName, monthStart, monthEnd);

  const dataCompleteness = computeOverallCompleteness(activeStudentsFullResult);
  const standardsCompleteness = aggregateCompleteness(standardsMasterResult, computeStandardCompleteness);
  const subjectsCompleteness = aggregateCompleteness(subjectsMasterResult, computeSubjectCompleteness);
  const staffCompleteness = aggregateCompleteness(employeesMasterResult, computeEmployeeCompleteness);

  const limitedOpsRole = isAccounts(user) || isPayrollRole(user);
  const showAcademicSection = !limitedOpsRole;

  const showFinanceSection = canViewFinance(user);
  const showOutstandingSection = canAccessFees(user);
  const showAccountsFeeCard = canAccessFees(user) && !canViewFinance(user);
  const showPayrollCard = canAccessPayroll(user) && !canViewFinance(user) && isPayrollRole(user);
  const netThisMonth = feeCollected - expensesThisMonth;

  const collectionPct = totalFeesCurrentYear > 0
    ? Math.round((totalPaidCurrentYear / totalFeesCurrentYear) * 100)
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <AcademicSection
        showAcademicSection={showAcademicSection}
        activeYearName={activeYearName}
        activeStudentsCount={activeStudentsCount}
        studentsCount={studentsCount}
        rteStudentsCount={rteStudentsCount}
        newAdmissionsCount={newAdmissionsCount}
        showFinanceSection={showFinanceSection}
        showPayrollCard={showPayrollCard}
        employeesCount={employeesCount}
        dataCompleteness={dataCompleteness}
        standardsCompleteness={standardsCompleteness}
        subjectsCompleteness={subjectsCompleteness}
        staffCompleteness={staffCompleteness}
        user={user}
      />

      <FinanceSection
        showFinanceSection={showFinanceSection}
        showAccountsFeeCard={showAccountsFeeCard}
        monthLabel={monthLabel}
        feeCollected={feeCollected}
        expensesThisMonth={expensesThisMonth}
        netThisMonth={netThisMonth}
      />

      <OutstandingFeesSection
        showOutstandingSection={showOutstandingSection}
        activeYearName={activeYearName}
        outstandingCurrentYear={outstandingCurrentYear}
        totalFeesCurrentYear={totalFeesCurrentYear}
        totalPaidCurrentYear={totalPaidCurrentYear}
        collectionPct={collectionPct}
        outstandingByQuarter={outstandingByQuarter}
        collectionsByQuarter={collectionsByQuarter}
      />

      <PayrollSection
        showPayrollCard={showPayrollCard}
        showAcademicSection={showAcademicSection}
        employeesCount={employeesCount}
        staffCompleteness={staffCompleteness}
      />
    </div>
  );
}
