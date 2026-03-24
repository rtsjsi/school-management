import { redirect } from "next/navigation";
import { getUser, canViewFinance, isClerk, isPayrollRole, canAccessFees, canAccessPayroll } from "@/lib/auth";
import { shouldApplyClassFilter, getStudentIdsForAllowedClasses } from "@/lib/class-access";
import { createClient } from "@/lib/supabase/server";
import {
  BookOpen,
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
    standardsCountRes,
    rteStudentsCountRes,
    newAdmissionsCountRes,
    feeCollectedResult,
    expensesResult,
  ] = await Promise.all([
    studentCountQuery({ count: "exact", head: true }),
    studentCountQuery({ count: "exact", head: true }, { status: "active" }),
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("standards").select("*", { count: "exact", head: true }),
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
  ]);

  const studentsCount = studentsCountRes.count ?? 0;
  const activeStudentsCount = activeStudentsCountRes.count ?? 0;
  const employeesCount = employeesCountRes.count ?? 0;
  const standardsCount = standardsCountRes.count ?? 0;
  const rteStudentsCount = rteStudentsCountRes.count ?? 0;
  const newAdmissionsCount = newAdmissionsCountRes.count ?? 0;

  const feeCollected = (feeCollectedResult.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount ?? 0),
    0
  );
  const expensesThisMonth = (expensesResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const netThisMonth = feeCollected - expensesThisMonth;

  const limitedOpsRole = isClerk(user) || isPayrollRole(user);

  const academicStatCards = limitedOpsRole
    ? []
    : [
        {
          title: "Standards",
          value: String(standardsCount ?? 0),
          description: "View standards",
          icon: BookOpen,
        },
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
