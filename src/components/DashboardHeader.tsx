"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { DashboardUserMenu } from "@/components/DashboardUserMenu";
import type { AuthUser } from "@/lib/auth";

const pathToBreadcrumb: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/academic-years": "Academic Year",
  "/dashboard/promotion": "Year-end promotion",
  "/dashboard/classes": "Standard management",
  "/dashboard/subjects": "Subject management",
  "/dashboard/students": "Students",
  "/dashboard/admission-enquiry": "Admission Enquiry",
  "/dashboard/class-strength": "Class strength",
  "/dashboard/fees": "Fees",
  "/dashboard/expenses": "Expenses",
  "/dashboard/payroll": "Payroll",
  "/dashboard/exams": "Exams",
  "/dashboard/users": "Users",
  "/dashboard/school-settings": "School settings",
};

function getBreadcrumbs(pathname: string): { href: string; label: string }[] {
  if (pathname === "/dashboard") {
    return [{ href: "/dashboard", label: "Dashboard" }];
  }
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [{ href: "/dashboard", label: "Dashboard" }];
  let acc = "/dashboard";
  for (let i = 1; i < segments.length; i++) {
    acc += "/" + segments[i];
    const label = pathToBreadcrumb[acc] ?? segments[i];
    crumbs.push({ href: acc, label: label.charAt(0).toUpperCase() + label.slice(1).replace(/-/g, " ") });
  }
  return crumbs;
}

export function DashboardHeader({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);
  const currentLabel = crumbs[crumbs.length - 1]?.label ?? "Dashboard";

  return (
    <header className="shrink-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
        <span className="font-medium text-foreground sm:hidden truncate">{currentLabel}</span>
        <div className="hidden sm:flex items-center gap-1.5 min-w-0">
          {crumbs.length > 1 ? (
            <>
              {crumbs.slice(0, -1).map((c) => (
                <span key={c.href} className="flex items-center gap-1.5 shrink-0">
                  <Link href={c.href} className="hover:text-foreground transition-colors truncate max-w-[8rem]">
                    {c.label}
                  </Link>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                </span>
              ))}
              <span className="font-medium text-foreground truncate">{currentLabel}</span>
            </>
          ) : (
            <span className="font-medium text-foreground">{currentLabel}</span>
          )}
        </div>
      </nav>
      <div className="shrink-0">
        <DashboardUserMenu user={user} />
      </div>
    </header>
  );
}
