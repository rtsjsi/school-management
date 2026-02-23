import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

const VALID_ROLES: UserRole[] = ["principal", "admin", "teacher", "auditor"];

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

// Cache getUser per request so multiple calls don't query Supabase multiple times
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Standard auth: resolve profile by auth user id only (profiles.id = auth.uid())
  const admin = createAdminClient();
  const client = admin ?? supabase;
  const { data: profile, error } = await client
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) console.error("[auth] profiles fetch error:", error.message);

  const role = normalizeRole(profile?.role);
  const fullName = profile?.full_name ?? null;

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    fullName,
  };
});

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

export function isPrincipal(user: AuthUser | null): boolean {
  return user?.role === "principal";
}

export function isAdminOrAbove(user: AuthUser | null): boolean {
  return user?.role === "principal" || user?.role === "admin";
}

export function isAuditor(user: AuthUser | null): boolean {
  return user?.role === "auditor";
}

export function canViewFinance(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || isAuditor(user);
}
