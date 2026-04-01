import { redirect } from "next/navigation";
import { getUser, canViewFinance, isClerk, isPayrollRole, canAccessFees, canAccessPayroll } from "@/lib/auth";
import { shouldApplyClassFilter, getStudentIdsForAllowedClasses } from "@/lib/class-access";
import { createClient } from "@/lib/supabase/server";
import { linesWithNetAfterConcession } from "@/lib/fee-concession";
import {
  GraduationCap,
  UserPlus,
  IndianRupee,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

/** Stats / summary at /dashboard — sidebar label “Dashboard”. */
export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const applyClassFilter = shouldApplyClassFilter(user);
  const allowedStudentIds = applyClassFilter ? await getStudentIdsForAllowedClasses(user.id) : null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

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
  ]);

  const studentsCount = studentsCountRes.count ?? 0;
  const activeStudentsCount = activeStudentsCountRes.count ?? 0;
  const employeesCount = employeesCountRes.count ?? 0;
  const rteStudentsCount = rteStudentsCountRes.count ?? 0;
  const newAdmissionsCount = newAdmissionsCountRes.count ?? 0;

  const feeCollected = (feeCollectedResult.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount ?? 0),
    0
  );
  const expensesThisMonth = (expensesResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const netThisMonth = feeCollected - expensesThisMonth;
  const outstandingByQuarter: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let outstandingCurrentYear = 0;

  if (activeYearName) {
    const paidMap = new Map<string, number>();
    (outstandingCollectionsResult.data ?? []).forEach((c: { student_id: string; quarter: number; fee_type: string; amount: number }) => {
      const key = `${c.student_id}-${c.quarter}-${c.fee_type}`;
      paidMap.set(key, (paidMap.get(key) ?? 0) + Number(c.amount ?? 0));
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
        const outstanding = Math.max(0, Number(line.net ?? 0) - paid);
        outstandingByQuarter[line.quarter as 1 | 2 | 3 | 4] += outstanding;
        outstandingCurrentYear += outstanding;
      }
    }
  }

  const limitedOpsRole = isClerk(user) || isPayrollRole(user);

  const academicStatCards = limitedOpsRole
    ? []
    : [
        {
          title: "Active students",
          value: String(activeStudentsCount ?? 0),
          description: `${studentsCount ?? 0} total enrolled`,
          icon: GraduationCap,
        },
        {
          title: "New admissions (current year)",
          value: String(newAdmissionsCount ?? 0),
          description: activeYearName ? activeYearName : "Set active academic year",
          icon: UserPlus,
        },
        {
          title: "RTE quota students",
          value: String(rteStudentsCount ?? 0),
          description: "Active students under RTE",
          icon: AlertCircle,
        },
      ];

  const outstandingCards = canAccessFees(user)
    ? [
        {
          title: "Outstanding fees (current year)",
          value: formatCurrency(outstandingCurrentYear),
          description: activeYearName || "Set active academic year",
          icon: AlertCircle,
        },
        {
          title: "Outstanding Q1",
          value: formatCurrency(outstandingByQuarter[1]),
          description: activeYearName || "Set active academic year",
          icon: AlertCircle,
        },
        {
          title: "Outstanding Q2",
          value: formatCurrency(outstandingByQuarter[2]),
          description: activeYearName || "Set active academic year",
          icon: AlertCircle,
        },
        {
          title: "Outstanding Q3",
          value: formatCurrency(outstandingByQuarter[3]),
          description: activeYearName || "Set active academic year",
          icon: AlertCircle,
        },
        {
          title: "Outstanding Q4",
          value: formatCurrency(outstandingByQuarter[4]),
          description: activeYearName || "Set active academic year",
          icon: AlertCircle,
        },
      ]
    : [];

  const financeAdminCards = canViewFinance(user)
    ? [
        {
          title: "Fee collected (this month)",
          value: formatCurrency(feeCollected),
          description: "Collections this month",
          icon: IndianRupee,
        },
        {
          title: "Net this month",
          value: formatCurrency(netThisMonth),
          description: "Collections − expenses",
          icon: TrendingUp,
        },
        {
          title: "Expenses (this month)",
          value: formatCurrency(expensesThisMonth),
          description: "Approved expenses",
          icon: TrendingUp,
        },
        {
          title: "Total employees",
          value: String(employeesCount ?? 0),
          description: "Staff & teachers",
          icon: UserPlus,
        },
        ...outstandingCards,
      ]
    : [];

  const clerkFeeCards =
    canAccessFees(user) && !canViewFinance(user)
      ? [
          {
            title: "Fee collected (this month)",
            value: formatCurrency(feeCollected),
            description: "Collections this month",
            icon: IndianRupee,
          },
          ...outstandingCards,
        ]
      : [];

  const payrollEmployeeCard =
    canAccessPayroll(user) && !canViewFinance(user) && isPayrollRole(user)
      ? [
          {
            title: "Total employees",
            value: String(employeesCount ?? 0),
            description: "Staff & teachers",
            icon: UserPlus,
          },
        ]
      : [];

  const statCards = [...academicStatCards, ...financeAdminCards, ...clerkFeeCards, ...payrollEmployeeCard];

  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
