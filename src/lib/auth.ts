import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

export type AuthUser = {
  id: string;
  email: string | null;
  role: UserRole;
  fullName: string | null;
};

export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as UserRole) ?? "teacher";
  const fullName = profile?.full_name ?? null;

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    fullName,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function hasRole(user: AuthUser | null, allowedRoles: UserRole[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === "super_admin";
}

export function isAdminOrAbove(user: AuthUser | null): boolean {
  return user?.role === "super_admin" || user?.role === "admin";
}
