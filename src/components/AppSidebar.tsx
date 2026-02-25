"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  DollarSign,
  FileQuestion,
  Menu,
  X,
  Wallet,
  Building2,
  Banknote,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("principal" | "admin" | "teacher" | "auditor")[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/academic-setup", label: "Academic setup", icon: BookOpen },
  { href: "/dashboard/students", label: "Students management", icon: GraduationCap },
  { href: "/dashboard/fees", label: "Fees management", icon: DollarSign, roles: ["principal", "admin", "auditor"] },
  { href: "/dashboard/expenses", label: "Expense management", icon: Banknote, roles: ["principal", "admin", "auditor"] },
  { href: "/dashboard/payroll", label: "Payroll", icon: Wallet, roles: ["principal", "admin", "auditor"] },
  { href: "/dashboard/exams", label: "Exam management", icon: FileQuestion },
  { href: "/dashboard/administration", label: "Administration", icon: Building2, roles: ["principal"] },
];

export function AppSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const school = useSchoolSettings();

  const filterByRole = (item: NavItem) => !item.roles || item.roles.includes(user.role);
  const items = navItems.filter(filterByRole);

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
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-foreground/10">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-foreground/10 px-3 py-2">
        <Link
          href="/dashboard"
          className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-90 transition-opacity"
          onClick={() => setMobileOpen(false)}
          title={school.name}
        >
          {school.logoUrl ? (
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-sidebar-foreground/10 flex items-center justify-center">
              <img
                src={school.logoUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-md bg-sidebar-foreground/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-sidebar-foreground/70" />
            </div>
          )}
          <span className="font-semibold text-sm leading-tight text-sidebar-foreground line-clamp-2 break-words">
            {school.name}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="lg:hidden shrink-0 text-sidebar-foreground hover:bg-sidebar-foreground/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <nav className="flex-1 min-h-0 space-y-0.5 p-2.5 overflow-y-auto scrollbar-hide">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 border-l-2",
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
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile header: full width on mobile, above main content */}
      <div className="shrink-0 z-40 flex min-h-[3.5rem] items-center gap-2 border-b border-border bg-background px-3 py-2 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
          className="rounded-lg shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2">
          {school.logoUrl ? (
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
              <img src={school.logoUrl} alt="" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="font-semibold text-sm text-foreground line-clamp-2 break-words">
            {school.name}
          </span>
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
