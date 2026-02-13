"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Shield, Users, BookOpen, UserPlus, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/lib/auth";
import { ROLES } from "@/types/auth";

export default function DashboardNav({ user }: { user: AuthUser }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const roleLabel = ROLES[user.role as keyof typeof ROLES] ?? user.role;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-blue-600 hover:text-blue-700"
            >
              School Management
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium"
              >
                Dashboard
              </Link>
              {user.role === "super_admin" && (
                <Link
                  href="/dashboard/users"
                  className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              )}
              {(user.role === "super_admin" || user.role === "admin") && (
                <>
                  <Link
                    href="/dashboard/students"
                    className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Students
                  </Link>
                  <Link
                    href="/dashboard/employees"
                    className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Employees
                  </Link>
                </>
              )}
              <Link
                href="/dashboard/classes"
                className="px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Classes
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{roleLabel}</span>
              <span className="text-gray-400">·</span>
              <span>{user.email ?? user.fullName ?? "User"}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
