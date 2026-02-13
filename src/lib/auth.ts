import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

const VALID_ROLES: UserRole[] = ["super_admin", "admin", "teacher"];

function normalizeRole(value: unknown): UserRole {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (VALID_ROLES.includes(s as UserRole)) return s as UserRole;
  return "teacher";
}

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[auth] profiles fetch error:", profileError.message);
  }

  const role = normalizeRole(profile?.role);
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
