import Link from "next/link";
import { getUser, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/types/auth";
import {
  BookOpen,
  GraduationCap,
  UserPlus,
  ArrowRight,
  IndianRupee,
  AlertCircle,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10) + "T00:00:00";
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const monthStart = thisMonthStart.slice(0, 10);
  const monthEnd = thisMonthEnd.slice(0, 10);

  const [
    { count: studentsCount },
    { count: activeStudentsCount },
    { count: employeesCount },
    { count: classesCount },
    feeCollectedResult,
    pendingFeesResult,
    { count: admissionEnquiriesCount },
    expensesResult,
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("employees").select("*", { count: "exact", head: true }),
    supabase.from("classes").select("*", { count: "exact", head: true }),
    supabase
      .from("fee_collections")
      .select("amount")
      .gte("collected_at", thisMonthStart)
      .lte("collected_at", thisMonthEnd),
    supabase
      .from("fees")
      .select("amount, paid_amount")
      .in("status", ["pending", "overdue"]),
    supabase
      .from("admission_enquiries")
      .select("*", { count: "exact", head: true })
      .gte("enquiry_date", monthStart)
      .lte("enquiry_date", monthEnd),
    supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", monthStart)
      .lte("expense_date", monthEnd),
  ]);

  const feeCollected = (feeCollectedResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
  const pendingFees = (pendingFeesResult.data ?? []).reduce(
    (sum, r) => sum + Math.max(0, Number(r.amount ?? 0) - Number(r.paid_amount ?? 0)),
    0
  );
  const expensesThisMonth = (expensesResult.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;

  const statCards = [
    ...(isAdminOrAbove(user)
      ? [
          {
            title: "Active students",
            value: String(activeStudentsCount ?? 0),
            description: `${studentsCount ?? 0} total enrolled`,
            icon: GraduationCap,
            href: "/dashboard/students",
          },
          {
            title: "Fee collected (this month)",
            value: formatCurrency(feeCollected),
            description: "Collections this month",
            icon: IndianRupee,
            href: "/dashboard/fees",
          },
          {
            title: "Pending fees",
            value: formatCurrency(pendingFees),
            description: "Outstanding amount",
            icon: AlertCircle,
            href: "/dashboard/fees",
          },
          {
            title: "Admission enquiries",
            value: String(admissionEnquiriesCount ?? 0),
            description: "This month",
            icon: UserCheck,
            href: "/dashboard/admission-enquiry",
          },
          {
            title: "Expenses (this month)",
            value: formatCurrency(expensesThisMonth),
            description: "This month",
            icon: TrendingUp,
            href: "/dashboard/expenses",
          },
        ]
      : []),
    ...(isAdminOrAbove(user)
      ? [{
          title: "Total employees",
          value: String(employeesCount ?? 0),
          description: "Staff & teachers",
          icon: UserPlus,
          href: "/dashboard/employees",
        }]
      : []),
    {
      title: "Classes",
      value: String(classesCount ?? 0),
      description: "View classes",
      icon: BookOpen,
      href: "/dashboard/classes",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome, {user.fullName ?? user.email ?? "User"}
        </h1>
        <p className="text-muted-foreground mt-1.5">
          Signed in as <Badge variant="secondary" className="font-medium">{roleLabel}</Badge>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const card = (
            <Card
              key={stat.title}
              className={stat.href ? "hover:shadow-card-hover hover:border-primary/20 transition-all duration-200" : ""}
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
