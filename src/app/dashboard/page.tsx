import Link from "next/link";
import { getUser, isSuperAdmin, isAdminOrAbove } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/types/auth";
import {
  BookOpen,
  GraduationCap,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const [{ count: studentsCount }, { count: employeesCount }] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("employees").select("*", { count: "exact", head: true }),
  ]);

  const { data: recentStudents } = await supabase
    .from("students")
    .select("id, full_name, email, grade, section")
    .order("created_at", { ascending: false })
    .limit(5);

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;

  const statCards = [
    ...(isAdminOrAbove(user)
      ? [{
          title: "Total students",
          value: String(studentsCount ?? 0),
          description: "Enrolled students",
          icon: GraduationCap,
          href: "/dashboard/students",
        }]
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
      value: "—",
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

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Recent students table (admin/super_admin) or placeholder */}
      {isAdminOrAbove(user) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent students</CardTitle>
            <CardDescription>Latest student entries</CardDescription>
          </CardHeader>
          <CardContent>
            {recentStudents && recentStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.email ?? "—"}</TableCell>
                      <TableCell>{s.grade ?? "—"}</TableCell>
                      <TableCell>{s.section ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No students yet.{" "}
                <Link href="/dashboard/students" className="text-primary hover:underline">
                  Add students
                </Link>
              </p>
            )}
            {recentStudents && recentStudents.length > 0 && (
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/dashboard/students">View all students</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role permissions</CardTitle>
            <CardDescription>Your access level</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">Teacher:</strong> View dashboard, manage own classes, view students.</li>
              <li>• <strong className="text-foreground">Admin:</strong> Everything teachers can do, plus user management and school settings.</li>
              <li>• <strong className="text-foreground">Super Admin:</strong> Full access: all admin features plus role assignment and system settings.</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {isSuperAdmin(user) && (
        <Card className="border-primary/25 bg-primary/5 shadow-card">
          <CardHeader>
            <CardTitle className="text-base text-primary">Super Admin</CardTitle>
            <CardDescription>You have full access. Use the Users page to assign roles.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
