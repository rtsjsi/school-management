import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser, canViewFinance, isClerk, isPayrollRole, canAccessFees, canAccessPayroll } from "@/lib/auth";
import { shouldApplyClassFilter, getStudentIdsForAllowedClasses } from "@/lib/class-access";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/types/auth";
import {
  BookOpen,
  GraduationCap,
  UserPlus,
  ArrowRight,
  IndianRupee,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10) + "T00:00:00";
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const monthStart = thisMonthStart.slice(0, 10);
  const monthEnd = thisMonthEnd.slice(0, 10);

  const { data: activeYear } = await supabase
    .from("academic_years")
    .select("name")
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

  const newAdmissionsPromise = activeYearName
    ? (applyClassFilter
        ? studentCountQuery({ count: "exact", head: true }, { academic_year: activeYearName })
        : supabase.from("students").select("*", { count: "exact", head: true }).eq("academic_year", activeYearName))
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
      .gte("collected_at", thisMonthStart)
      .lte("collected_at", thisMonthEnd),
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

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;

  const limitedOpsRole = isClerk(user) || isPayrollRole(user);

  const academicStatCards = limitedOpsRole
    ? []
    : [
        {
          title: "Standards",
          value: String(standardsCount ?? 0),
          description: "View standards",
          icon: BookOpen,
          href: "/dashboard/classes",
        },
        {
          title: "Active students",
          value: String(activeStudentsCount ?? 0),
          description: `${studentsCount ?? 0} total enrolled`,
          icon: GraduationCap,
          href: "/dashboard/students",
        },
        {
          title: "New admissions (current year)",
          value: String(newAdmissionsCount ?? 0),
          description: activeYearName ? activeYearName : "Set active academic year",
          icon: UserPlus,
          href: "/dashboard/students",
        },
        {
          title: "RTE quota students",
          value: String(rteStudentsCount ?? 0),
          description: "Active students under RTE",
          icon: AlertCircle,
          href: "/dashboard/students",
        },
      ];

  const financeAdminCards = canViewFinance(user)
    ? [
        {
          title: "Fee collected (this month)",
          value: formatCurrency(feeCollected),
          description: "Collections this month",
          icon: IndianRupee,
          href: "/dashboard/fees",
        },
        {
          title: "Net this month",
          value: formatCurrency(netThisMonth),
          description: "Collections − expenses",
          icon: TrendingUp,
          href: "/dashboard/fees",
        },
        {
          title: "Expenses (this month)",
          value: formatCurrency(expensesThisMonth),
          description: "Approved expenses",
          icon: TrendingUp,
          href: "/dashboard/expenses",
        },
        {
          title: "Total employees",
          value: String(employeesCount ?? 0),
          description: "Staff & teachers",
          icon: UserPlus,
          href: "/dashboard/payroll",
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
            href: "/dashboard/fees",
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
            href: "/dashboard/payroll",
          },
        ]
      : [];

  const statCards = [...academicStatCards, ...financeAdminCards, ...clerkFeeCards, ...payrollEmployeeCard];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="caption mt-1.5">
          Overview for <Badge variant="secondary" className="font-medium">{roleLabel}</Badge>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const card = (
            <Card
              key={stat.title}
              className={stat.href ? "hover:shadow-card-hover hover:border-primary/15 transition-all duration-200 ease-out" : ""}
            >
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
                {stat.href && (
                  <Button variant="link" className="mt-2 h-auto p-0 text-primary font-medium" asChild>
                    <Link href={stat.href}>
                      View <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
          return stat.href ? <Link key={stat.title} href={stat.href} className="block group">{card}</Link> : <div key={stat.title}>{card}</div>;
        })}
      </div>
    </div>
  );
}
