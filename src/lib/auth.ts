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
// This deduplicates calls on the same page load
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Prefer admin client (bypasses RLS) so role is always read correctly.
  // When admin is available, look up by email first so role is correct even if auth.users id
  // and profiles id are out of sync (e.g. after dev→main clone or different Auth/DB state).
  const admin = createAdminClient();
  let profile: { role: unknown; full_name: string | null } | null = null;

  if (admin && user.email) {
    const byEmail = await admin.from("profiles").select("role, full_name").eq("email", user.email).maybeSingle();
    if (byEmail.data) profile = byEmail.data;
    if (byEmail.error) console.error("[auth] profiles by email:", byEmail.error.message);
  }

  if (!profile) {
    const profileSource = admin
      ? await admin.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle()
      : await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
    profile = profileSource.data;
    if (profileSource.error) console.error("[auth] profiles fetch error:", profileSource.error.message);
  }

  if (!profile && user?.email) {
    if (!admin) {
      console.warn(
        "[auth] No profile found and SUPABASE_SERVICE_ROLE_KEY is not set. " +
          "Set it in production (e.g. Vercel env) so the app can resolve role by email. " +
          "User id=" + user.id + " email=" + user.email
      );
    } else {
      console.warn(
        "[auth] No profile row for user id=" + user.id + " email=" + user.email + ". Sign out and sign in again after a DB clone."
      );
    }
  }

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
