import { createClient } from "@/lib/supabase/server";
import { shouldApplyClassFilter, getStudentIdsForAllowedClasses } from "@/lib/class-access";
import { isAccounts, isPayrollRole, canAccessPayroll } from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { linesWithNetAfterConcession } from "@/lib/fee-concession";

export async function fetchDashboardData(user: AuthUser, activeYearName: string | null, monthStart: string, monthEnd: string) {
  const supabase = await createClient();
  const applyClassFilter = shouldApplyClassFilter(user);
  const allowedStudentIds = applyClassFilter ? await getStudentIdsForAllowedClasses(user.id) : null;

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

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("start_date, end_date")
    .eq("name", activeYearName)
    .maybeSingle();

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

  const feeCollected = (feeCollectedResult.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount ?? 0), 0
  );
  const expensesThisMonth = (expensesResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  
  let outstandingCurrentYear = 0;
  let totalFeesCurrentYear = 0;
  let totalPaidCurrentYear = 0;
  const outstandingByQuarter: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const collectionsByQuarter: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

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

  return {
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
    activeStudentsFullResult: (activeStudentsFullResult.data ?? []) as Record<string, unknown>[],
    standardsMasterResult: (standardsMasterResult.data ?? []) as Record<string, unknown>[],
    subjectsMasterResult: (subjectsMasterResult.data ?? []) as Record<string, unknown>[],
    employeesMasterResult: (employeesMasterResult.data ?? []) as Record<string, unknown>[],
  };
}
