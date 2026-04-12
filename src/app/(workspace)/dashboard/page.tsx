import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { getUser, canViewFinance, isAccounts, isPayrollRole, canAccessFees, canAccessPayroll } from "@/lib/auth";
import { shouldApplyClassFilter, getStudentIdsForAllowedClasses } from "@/lib/class-access";
import { createClient } from "@/lib/supabase/server";
import { linesWithNetAfterConcession } from "@/lib/fee-concession";
import { computeOverallCompleteness } from "@/lib/student-completeness";
import {
  aggregateCompleteness,
  computeEmployeeCompleteness,
  computeStandardCompleteness,
  computeSubjectCompleteness,
  type AggregatedCompleteness,
} from "@/lib/master-data-completeness";
import {
  GraduationCap,
  UserPlus,
  IndianRupee,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Receipt,
  ClipboardCheck,
  LayoutGrid,
  BookMarked,
  BadgeCheck,
} from "lucide-react";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

function MasterDataCompletenessCard({
  title,
  Icon,
  summary,
  footer,
}: {
  title: string;
  Icon: LucideIcon;
  summary: AggregatedCompleteness;
  footer: string;
}) {
  if (summary.total === 0) return null;
  const pct = summary.averagePercent;
  const colorText =
    pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-destructive";
  const colorIconWrap =
    pct >= 80 ? "bg-green-500/10" : pct >= 50 ? "bg-amber-500/10" : "bg-destructive/10";
  const colorIcon = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-destructive";
  const colorBar = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">{title}</p>
          <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${colorText}`}>{pct}%</p>
        </div>
        <div className={`rounded-xl p-2 sm:p-2.5 ${colorIconWrap}`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${colorIcon}`} />
        </div>
      </div>
      <div className="mt-2 space-y-1.5 sm:mt-3">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden sm:h-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorBar}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground sm:text-xs">{footer}</p>
      </div>
    </div>
  );
}

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

  const studentIdFilter = allowedStudentIds && allowedStudentIds.size > 0 ? Array.from(allowedStudentIds) : null;
  const restrictToZeroStudents = applyClassFilter && allowedStudentIds !== null && allowedStudentIds.size === 0;
  const studentCountQuery = (opts: { count: "exact"; head: true }, extra?: Record<string, unknown>) => {
    if (restrictToZeroStudents) return Promise.resolve({ count: 0 });
    let q = supabase.from("students").select("*", opts);
    if (studentIdFilter && studentIdFilter.length > 0) q = q.in("id", studentIdFilter);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        q = q.eq(k, v);
      }
    }
    return q;
  };

  const hasYearRange = !!activeYear?.start_date && !!activeYear?.end_date;
  const newAdmissionsCountQuery = () => {
    let q = supabase.from("students").select("*", { count: "exact", head: true });
    if (studentIdFilter && studentIdFilter.length > 0) q = q.in("id", studentIdFilter);
    return q;
  };
  const newAdmissionsPromise = hasYearRange
    ? (restrictToZeroStudents
        ? Promise.resolve({ count: 0 } as { count: number | null })
        : newAdmissionsCountQuery()
            .gte("admission_date", activeYear.start_date)
            .lte("admission_date", activeYear.end_date))
    : Promise.resolve({ count: null } as { count: number | null });

  const limitedOpsRole = isAccounts(user) || isPayrollRole(user);
  const showAcademicSection = !limitedOpsRole;

  const activeStudentsFullQuery = (() => {
    if (restrictToZeroStudents) return Promise.resolve({ data: [] as Record<string, unknown>[] });
    let q = supabase.from("students").select("*").eq("status", "active");
    if (studentIdFilter && studentIdFilter.length > 0) q = q.in("id", studentIdFilter);
    return q;
  })();

  const standardsMasterQuery = showAcademicSection
    ? supabase.from("standards").select("id, name, section, sort_order, standard_divisions(id)").order("sort_order")
    : Promise.resolve({ data: [] as Record<string, unknown>[] });

  const subjectsMasterQuery = showAcademicSection
    ? supabase.from("subjects").select("id, name, evaluation_type, subject_teacher_id")
    : Promise.resolve({ data: [] as Record<string, unknown>[] });

  const employeesMasterQuery = canAccessPayroll(user)
    ? supabase
        .from("employees")
        .select(
          "id, full_name, email, phone_number, address, aadhaar, pan, role, department, employee_type, joining_date, monthly_salary, degree, institution, year_passed, bank_name, account_number, ifsc_code, account_holder_name",
        )
    : Promise.resolve({ data: [] as Record<string, unknown>[] });

  const [
    studentsCountRes,
    activeStudentsCountRes,
    employeesCountRes,
    rteStudentsCountRes,
    newAdmissionsCountRes,
    feeCollectedResult,
    expensesResult,
    outstandingStudentsResult,
    outstandingStructuresResult,
    outstandingCollectionsResult,
    activeStudentsFullResult,
    standardsMasterResult,
    subjectsMasterResult,
    employeesMasterResult,
  ] = await Promise.all([
    studentCountQuery({ count: "exact", head: true }),
    studentCountQuery({ count: "exact", head: true }, { status: "active" }),
    supabase.from("employees").select("*", { count: "exact", head: true }),
    studentCountQuery({ count: "exact", head: true }, { status: "active", is_rte_quota: true }),
    newAdmissionsPromise,
    supabase
      .from("fee_collections")
      .select("amount")
      .gte("collection_date", monthStart)
      .lte("collection_date", monthEnd),
    supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd),
    activeYearName
      ? (() => {
          let q = supabase
            .from("students")
            .select("id, standard, fee_concession_amount, is_rte_quota")
            .eq("status", "active");
          if (studentIdFilter && studentIdFilter.length > 0) q = q.in("id", studentIdFilter);
          return q;
        })()
      : Promise.resolve({ data: [] as unknown[] }),
    activeYearName
      ? supabase
          .from("fee_structures")
          .select("id, standards(name), fee_structure_items(fee_type, quarter, amount)")
          .eq("academic_year", activeYearName)
      : Promise.resolve({ data: [] as unknown[] }),
    activeYearName
      ? (() => {
          let q = supabase
            .from("fee_collections")
            .select("student_id, quarter, fee_type, amount")
            .eq("academic_year", activeYearName);
          if (studentIdFilter && studentIdFilter.length > 0) q = q.in("student_id", studentIdFilter);
          return q;
        })()
      : Promise.resolve({ data: [] as unknown[] }),
    activeStudentsFullQuery,
    standardsMasterQuery,
    subjectsMasterQuery,
    employeesMasterQuery,
  ]);

  const studentsCount = studentsCountRes.count ?? 0;
  const activeStudentsCount = activeStudentsCountRes.count ?? 0;
  const employeesCount = employeesCountRes.count ?? 0;
  const rteStudentsCount = rteStudentsCountRes.count ?? 0;
  const newAdmissionsCount = newAdmissionsCountRes.count ?? 0;

  const dataCompleteness = computeOverallCompleteness(
    (activeStudentsFullResult.data ?? []) as Record<string, unknown>[],
  );

  const standardsCompleteness = aggregateCompleteness(
    (standardsMasterResult.data ?? []) as Record<string, unknown>[],
    computeStandardCompleteness,
  );
  const subjectsCompleteness = aggregateCompleteness(
    (subjectsMasterResult.data ?? []) as Record<string, unknown>[],
    computeSubjectCompleteness,
  );
  const staffCompleteness = aggregateCompleteness(
    (employeesMasterResult.data ?? []) as Record<string, unknown>[],
    computeEmployeeCompleteness,
  );

  const feeCollected = (feeCollectedResult.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount ?? 0), 0
  );
  const expensesThisMonth = (expensesResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const netThisMonth = feeCollected - expensesThisMonth;
  const outstandingByQuarter: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const collectionsByQuarter: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let outstandingCurrentYear = 0;
  let totalFeesCurrentYear = 0;
  let totalPaidCurrentYear = 0;

  if (activeYearName) {
    const paidMap = new Map<string, number>();
    const outstandingCollections = (outstandingCollectionsResult.data ?? []) as {
      student_id: string;
      quarter: number;
      fee_type: string;
      amount: number;
    }[];
    outstandingCollections.forEach((c) => {
      const key = `${c.student_id}-${c.quarter}-${c.fee_type}`;
      paidMap.set(key, (paidMap.get(key) ?? 0) + Number(c.amount ?? 0));
      if (c.quarter >= 1 && c.quarter <= 4) {
        collectionsByQuarter[c.quarter as 1 | 2 | 3 | 4] += Number(c.amount ?? 0);
      }
    });

    const structures = (outstandingStructuresResult.data ?? []) as {
      standards?: { name?: string } | { name?: string }[] | null;
      fee_structure_items?: { fee_type: string; quarter: number; amount: number }[];
    }[];
    const studentsForOutstanding = (outstandingStudentsResult.data ?? []) as {
      id: string;
      standard?: string | null;
      is_rte_quota?: boolean | null;
      fee_concession_amount?: number | null;
    }[];

    for (const s of studentsForOutstanding) {
      if (s.is_rte_quota) continue;
      const structure = structures.find((st) => {
        const std = Array.isArray(st.standards)
          ? (st.standards[0] as { name?: string })?.name
          : (st.standards as { name?: string } | null)?.name;
        return std && std === (s.standard ?? "");
      });
      if (!structure) continue;

      const items = structure.fee_structure_items ?? [];
      const lines = linesWithNetAfterConcession(items, s.fee_concession_amount ?? null);
      for (const line of lines) {
        if (line.quarter < 1 || line.quarter > 4) continue;
        const key = `${s.id}-${line.quarter}-${line.fee_type}`;
        const paid = paidMap.get(key) ?? 0;
        const feeAmount = Number(line.net ?? 0);
        totalFeesCurrentYear += feeAmount;
        totalPaidCurrentYear += Math.min(paid, feeAmount);
        const outstanding = Math.max(0, feeAmount - paid);
        outstandingByQuarter[line.quarter as 1 | 2 | 3 | 4] += outstanding;
        outstandingCurrentYear += outstanding;
      }
    }
  }

  const showFinanceSection = canViewFinance(user);
  const showOutstandingSection = canAccessFees(user);
  const showAccountsFeeCard = canAccessFees(user) && !canViewFinance(user);
  const showPayrollCard = canAccessPayroll(user) && !canViewFinance(user) && isPayrollRole(user);

  const collectionPct = totalFeesCurrentYear > 0
    ? Math.round((totalPaidCurrentYear / totalFeesCurrentYear) * 100)
    : 0;

  const quarterLabels = ["Apr–Jun", "Jul–Sep", "Oct–Dec", "Jan–Mar"];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ──── Academic Section ──── */}
      {showAcademicSection && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">Academics</h2>
            {activeYearName && (
              <span className="ml-auto text-[10px] text-muted-foreground sm:text-xs">{activeYearName}</span>
            )}
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {/* Active Students — hero card */}
            <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover col-span-2 sm:col-span-1 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Active Students</p>
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmtNum(activeStudentsCount)}</p>
                </div>
                <div className="rounded-xl bg-primary/10 p-2 sm:p-2.5">
                  <GraduationCap className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground sm:mt-3 sm:gap-3 sm:text-xs">
                <span>{fmtNum(studentsCount)} total enrolled</span>
                {rteStudentsCount > 0 && (
                  <>
                    <span className="text-border">|</span>
                    <span>{fmtNum(rteStudentsCount)} RTE quota</span>
                  </>
                )}
              </div>
            </div>

            {/* New Admissions */}
            <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">New Admissions</p>
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmtNum(newAdmissionsCount)}</p>
                </div>
                <div className="rounded-xl bg-green-500/10 p-2 sm:p-2.5">
                  <UserPlus className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">
                {activeYearName ?? "Set active academic year"}
              </p>
            </div>

            {/* Employees — if visible */}
            {(showFinanceSection || showPayrollCard) && (
              <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Total Employees</p>
                    <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmtNum(employeesCount)}</p>
                  </div>
                  <div className="rounded-xl bg-violet-500/10 p-2 sm:p-2.5">
                    <Users className="h-4 w-4 text-violet-600 sm:h-5 sm:w-5" />
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Staff & teachers</p>
              </div>
            )}

            {/* Data Completeness */}
            {dataCompleteness.total > 0 && (
              <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Student records</p>
                    <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${
                      dataCompleteness.averagePercent >= 80
                        ? "text-green-600"
                        : dataCompleteness.averagePercent >= 50
                          ? "text-amber-600"
                          : "text-destructive"
                    }`}>
                      {dataCompleteness.averagePercent}%
                    </p>
                  </div>
                  <div className={`rounded-xl p-2 sm:p-2.5 ${
                    dataCompleteness.averagePercent >= 80
                      ? "bg-green-500/10"
                      : dataCompleteness.averagePercent >= 50
                        ? "bg-amber-500/10"
                        : "bg-destructive/10"
                  }`}>
                    <ClipboardCheck className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      dataCompleteness.averagePercent >= 80
                        ? "text-green-600"
                        : dataCompleteness.averagePercent >= 50
                          ? "text-amber-600"
                          : "text-destructive"
                    }`} />
                  </div>
                </div>
                <div className="mt-2 space-y-1.5 sm:mt-3">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden sm:h-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dataCompleteness.averagePercent >= 80
                          ? "bg-green-500"
                          : dataCompleteness.averagePercent >= 50
                            ? "bg-amber-500"
                            : "bg-destructive"
                      }`}
                      style={{ width: `${Math.min(dataCompleteness.averagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    {fmtNum(dataCompleteness.fullyComplete)} of {fmtNum(dataCompleteness.total)} students fully complete
                  </p>
                </div>
              </div>
            )}

            <MasterDataCompletenessCard
              title="Standards setup"
              Icon={LayoutGrid}
              summary={standardsCompleteness}
              footer={`${fmtNum(standardsCompleteness.fullyComplete)} of ${fmtNum(standardsCompleteness.total)} standards fully complete`}
            />
            <MasterDataCompletenessCard
              title="Subjects setup"
              Icon={BookMarked}
              summary={subjectsCompleteness}
              footer={`${fmtNum(subjectsCompleteness.fullyComplete)} of ${fmtNum(subjectsCompleteness.total)} subjects fully complete`}
            />
            {canAccessPayroll(user) && (
              <MasterDataCompletenessCard
                title="Staff records"
                Icon={BadgeCheck}
                summary={staffCompleteness}
                footer={`${fmtNum(staffCompleteness.fullyComplete)} of ${fmtNum(staffCompleteness.total)} staff fully complete`}
              />
            )}
          </div>
        </section>
      )}

      {/* ──── Finance Section ──── */}
      {(showFinanceSection || showAccountsFeeCard) && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">
              Finance
            </h2>
            <span className="ml-auto text-[10px] text-muted-foreground sm:text-xs">{monthLabel}</span>
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 sm:gap-4">
            {/* Fee Collected */}
            <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover col-span-2 sm:col-span-1 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Fee Collected</p>
                  <p className="text-2xl font-bold tracking-tight text-green-600 sm:text-3xl">{fmt(feeCollected)}</p>
                </div>
                <div className="rounded-xl bg-green-500/10 p-2 sm:p-2.5">
                  <IndianRupee className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Collections this month</p>
            </div>

            {showFinanceSection && (
              <>
                {/* Expenses */}
                <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Expenses</p>
                      <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmt(expensesThisMonth)}</p>
                    </div>
                    <div className="rounded-xl bg-orange-500/10 p-2 sm:p-2.5">
                      <Receipt className="h-4 w-4 text-orange-600 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Approved expenses this month</p>
                </div>

                {/* Net */}
                <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Net Income</p>
                      <p className={`text-2xl font-bold tracking-tight sm:text-3xl ${netThisMonth >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {fmt(netThisMonth)}
                      </p>
                    </div>
                    <div className={`rounded-xl p-2 sm:p-2.5 ${netThisMonth >= 0 ? "bg-green-500/10" : "bg-destructive/10"}`}>
                      {netThisMonth >= 0
                        ? <TrendingUp className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
                        : <TrendingDown className="h-4 w-4 text-destructive sm:h-5 sm:w-5" />
                      }
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Collections − expenses</p>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ──── Outstanding Fees Section ──── */}
      {showOutstandingSection && activeYearName && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-destructive" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">
              Outstanding Fees
            </h2>
            <span className="ml-auto text-[10px] text-muted-foreground sm:text-xs">{activeYearName}</span>
          </div>

          {/* Total outstanding — featured card with progress */}
          <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0 sm:gap-4">
                <div className="rounded-xl bg-destructive/10 p-2.5 shrink-0 sm:p-3">
                  <Wallet className="h-5 w-5 text-destructive sm:h-6 sm:w-6" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Total Outstanding</p>
                  <p className="text-2xl font-bold tracking-tight text-destructive sm:text-3xl">{fmt(outstandingCurrentYear)}</p>
                </div>
              </div>
              {totalFeesCurrentYear > 0 && (
                <div className="flex flex-col gap-1.5 sm:items-end sm:min-w-[180px]">
                  <div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground w-full sm:justify-end sm:text-xs">
                    <span>Collected: {fmt(totalPaidCurrentYear)}</span>
                    <span className="font-semibold text-foreground">{collectionPct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden sm:h-2">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${Math.min(collectionPct, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs">
                    of {fmt(totalFeesCurrentYear)} total fees
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quarter breakdown — outstanding */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {([1, 2, 3, 4] as const).map((q) => {
              const qOutstanding = outstandingByQuarter[q];
              return (
                <div
                  key={q}
                  className="rounded-card border border-border bg-gradient-to-b from-card to-muted/20 p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-4"
                >
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Q{q} <span className="text-muted-foreground/70">({quarterLabels[q - 1]})</span></p>
                  <p className={`text-base font-bold tracking-tight mt-1 sm:text-lg ${qOutstanding > 0 ? "text-destructive" : "text-green-600"}`}>
                    {fmt(qOutstanding)}
                  </p>
                  {qOutstanding === 0 && (
                    <p className="text-[10px] text-green-600 mt-0.5">All clear</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total collection for active year */}
          <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0 sm:gap-4">
                <div className="rounded-xl bg-green-500/10 p-2.5 shrink-0 sm:p-3">
                  <Wallet className="h-5 w-5 text-green-600 sm:h-6 sm:w-6" />
                </div>
                <div className="space-y-1 min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Total Collection</p>
                  <p className="text-2xl font-bold tracking-tight text-green-600 sm:text-3xl">{fmt(totalPaidCurrentYear)}</p>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground sm:text-xs sm:text-right">
                Current academic year
              </div>
            </div>
          </div>

          {/* Quarter-wise total collection */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
              Total Collection by Quarter
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {([1, 2, 3, 4] as const).map((q) => {
                const qCollection = collectionsByQuarter[q];
                return (
                  <div
                    key={`collection-${q}`}
                    className="rounded-card border border-border bg-gradient-to-b from-card to-muted/20 p-3 shadow-card transition-shadow hover:shadow-card-hover sm:p-4"
                  >
                    <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                      Q{q} <span className="text-muted-foreground/70">({quarterLabels[q - 1]})</span>
                    </p>
                    <p className="text-base font-bold tracking-tight mt-1 text-green-600 sm:text-lg">
                      {fmt(qCollection)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Payroll-only employee card (when no other sections show employees) */}
      {showPayrollCard && !showAcademicSection && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sm:text-sm">Payroll</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 sm:gap-4">
            <div className="rounded-card border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover col-span-2 sm:col-span-1 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">Total Employees</p>
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl">{fmtNum(employeesCount)}</p>
                </div>
                <div className="rounded-xl bg-violet-500/10 p-2 sm:p-2.5">
                  <Users className="h-4 w-4 text-violet-600 sm:h-5 sm:w-5" />
                </div>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground sm:mt-3 sm:text-xs">Staff & teachers</p>
            </div>
            <MasterDataCompletenessCard
              title="Staff records"
              Icon={BadgeCheck}
              summary={staffCompleteness}
              footer={`${fmtNum(staffCompleteness.fullyComplete)} of ${fmtNum(staffCompleteness.total)} staff fully complete`}
            />
          </div>
        </section>
      )}
    </div>
  );
}
