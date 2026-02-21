"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  BookMarked,
  CalendarRange,
  DollarSign,
  FileQuestion,
  Receipt,
  Menu,
  X,
  ClipboardList,
  BarChart3,
  Wallet,
  Building2,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("principal" | "admin" | "teacher")[];
};

type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Academic setup",
    items: [
      { href: "/dashboard/academic-years", label: "Academic Year", icon: CalendarRange },
      { href: "/dashboard/promotion", label: "Year-end promotion", icon: GraduationCap, roles: ["principal", "admin"] },
      { href: "/dashboard/classes", label: "Standard management", icon: BookOpen },
      { href: "/dashboard/subjects", label: "Subject management", icon: BookMarked },
    ],
  },
  {
    label: "Students",
    items: [
      { href: "/dashboard/students", label: "Students management", icon: GraduationCap },
      { href: "/dashboard/admission-enquiry", label: "Admission Enquiry", icon: ClipboardList, roles: ["principal", "admin"] },
      { href: "/dashboard/class-strength", label: "Class strength report", icon: BarChart3 },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/fees", label: "Fees management", icon: DollarSign, roles: ["principal", "admin"] },
      { href: "/dashboard/expenses", label: "Expense management", icon: Receipt, roles: ["principal", "admin"] },
      { href: "/dashboard/payroll", label: "Payroll", icon: Wallet, roles: ["principal", "admin"] },
    ],
  },
  {
    label: "Exams",
    items: [{ href: "/dashboard/exams", label: "Exam management", icon: FileQuestion }],
  },
  {
    label: "Administration",
    items: [
      { href: "/dashboard/users", label: "Users", icon: Users, roles: ["principal"] },
      { href: "/dashboard/school-settings", label: "School settings", icon: Building2, roles: ["principal"] },
    ],
  },
];

export function AppSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filterByRole = (item: NavItem) => !item.roles || item.roles.includes(user.role);
  const groupsWithItems = navGroups
    .map((g) => ({ ...g, items: g.items.filter(filterByRole) }))
    .filter((g) => g.items.length > 0);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const sidebar = (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-foreground/10 px-5">
        <Link
          href="/dashboard"
          className="font-semibold text-lg tracking-tight text-sidebar-foreground hover:opacity-90 transition-opacity"
          onClick={() => setMobileOpen(false)}
        >
          School
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="lg:hidden text-sidebar-foreground hover:bg-sidebar-foreground/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {groupsWithItems.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && <Separator className="my-2 bg-sidebar-foreground/10" />}
            <p className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider px-3 py-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border-l-2",
                        isActive
                          ? "bg-sidebar-foreground/15 text-sidebar-foreground border-sidebar-foreground/50"
                          : "border-transparent text-sidebar-foreground/85 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-90" />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/80 bg-card shadow-card px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          className="rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="font-semibold text-foreground">
          School Management
        </Link>
      </div>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
      {/* Sidebar: fixed on desktop, full-screen drawer on mobile */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 w-64 h-full transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          "h-screen lg:h-full",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>
    </>
  );
}
