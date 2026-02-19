"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserPlus,
  BookOpen,
  DollarSign,
  FileQuestion,
  Receipt,
  LogOut,
  Loader2,
  Menu,
  Clock,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/auth";
import { ROLES } from "@/types/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles?: ("super_admin" | "admin" | "teacher")[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["super_admin"] },
  { href: "/dashboard/students", label: "Students management", icon: GraduationCap },
  { href: "/dashboard/admission-enquiry", label: "Admission Enquiry", icon: ClipboardList, roles: ["super_admin", "admin"] },
  { href: "/dashboard/employees", label: "Employees", icon: UserPlus, roles: ["super_admin", "admin"] },
  { href: "/dashboard/classes", label: "Classes", icon: BookOpen },
  { href: "/dashboard/fees", label: "Fees management", icon: DollarSign, roles: ["super_admin", "admin"] },
  { href: "/dashboard/exams", label: "Exam management", icon: FileQuestion },
  { href: "/dashboard/expenses", label: "Expense management", icon: Receipt, roles: ["super_admin", "admin"] },
  { href: "/dashboard/attendance", label: "Shift & Attendance", icon: Clock, roles: ["super_admin", "admin"] },
  { href: "/dashboard/class-strength", label: "Class strength report", icon: BarChart3 },
];

export function AppSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;
  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  const sidebar = (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-foreground/10 px-5">
        <Link
          href="/dashboard"
          className="font-semibold text-lg tracking-tight text-sidebar-foreground hover:opacity-90 transition-opacity"
        >
          School
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {filteredNav.map((item) => {
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
      </nav>
      <Separator className="bg-sidebar-foreground/10" />
      <div className="p-3">
        <div className="rounded-xl bg-sidebar-foreground/5 border border-sidebar-foreground/10 px-3 py-2.5 text-xs text-sidebar-foreground/90">
          <p className="font-semibold text-sidebar-foreground">{roleLabel}</p>
          <p className="truncate mt-0.5 text-sidebar-foreground/80">{user.email ?? user.fullName ?? "User"}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-sidebar-foreground/90 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground rounded-lg"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          ) : (
            <LogOut className="h-4 w-4 shrink-0" />
          )}
          <span className="ml-2">{signingOut ? "Signing out…" : "Sign out"}</span>
        </Button>
      </div>
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
      {/* Sidebar: fixed on desktop, drawer on mobile */}
      <aside
        className={cn(
          "fixed left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          "top-0 h-full lg:top-0",
          "top-14 h-[calc(100vh-3.5rem)] lg:top-0 lg:h-full",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>
    </>
  );
}
