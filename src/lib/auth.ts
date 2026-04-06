import { cache } from "react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

const VALID_ROLES: UserRole[] = ["principal", "admin", "teacher", "auditor", "accounts", "payroll"];

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

  if (!user) {
    console.warn("[auth:getUser] No auth user found");
    return null;
  }

  // Standard auth: resolve profile primarily by auth user id (profiles.id = auth.uid()).
  // In case of data drift (e.g. cloned DB where id/email mismatch), fall back to email lookup.
  const admin = createAdminClient();
  if (!admin) {
    console.warn("[auth:getUser] Admin client NOT available – using anon/authenticated client", {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  } else {
    console.info("[auth:getUser] Admin client available – using service role for profiles lookup");
  }
  const client = admin ?? supabase;

  const {
    data: profileById,
    error: errorById,
  } = await client
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  let profile = profileById;

  if (!profile && user.email) {
    const {
      data: profileByEmail,
      error: errorByEmail,
    } = await client
      .from("profiles")
      .select("role, full_name")
      .eq("email", user.email)
      .maybeSingle();

    if (profileByEmail) {
      profile = profileByEmail;
      console.info("[auth:getUser] Using profile by email", {
        authId: user.id,
        authEmail: user.email,
        profileEmail: user.email,
        rawRole: profileByEmail.role,
      });
    }
    if (errorByEmail) {
      console.error("[auth:getUser] profiles fetch by email error:", errorByEmail.message, {
        authId: user.id,
        authEmail: user.email,
      });
    }
  }

  if (errorById) {
    console.error("[auth:getUser] profiles fetch by id error:", errorById.message, {
      authId: user.id,
      authEmail: user.email,
    });
  }

  if (profileById) {
    console.info("[auth:getUser] Using profile by id", {
      authId: user.id,
      authEmail: user.email,
      rawRole: profileById.role,
    });
  }

  if (!profile) {
    console.warn("[auth:getUser] No profile found by id or email", {
      authId: user.id,
      authEmail: user.email,
    });
  }

  const role = normalizeRole(profile?.role);
  const fullName = profile?.full_name ?? null;

  console.info("[auth:getUser] Final user role", {
    authId: user.id,
    authEmail: user.email,
    rawRole: profile?.role ?? null,
    normalizedRole: role,
  });

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

/** Who may use the signed-in workspace shell (/welcome, /dashboard/*, etc.). */
export function canAccessDashboard(user: AuthUser | null): boolean {
  if (!user) return false;
  return (
    isAdminOrAbove(user) ||
    user.role === "teacher" ||
    user.role === "accounts" ||
    user.role === "payroll" ||
    user.role === "auditor"
  );
}

export function isAccounts(user: AuthUser | null): boolean {
  return user?.role === "accounts";
}

export function isPayrollRole(user: AuthUser | null): boolean {
  return user?.role === "payroll";
}

/** Fees management (collection, structure, reports). */
export function canAccessFees(user: AuthUser | null): boolean {
  if (!user) return false;
  return isAdminOrAbove(user) || isAccounts(user) || isAuditor(user);
}

export function canEditFees(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || isAccounts(user);
}

/** Payroll module (attendance, payslips, NEFT, etc.). */
export function canAccessPayroll(user: AuthUser | null): boolean {
  if (!user) return false;
  return isAdminOrAbove(user) || isPayrollRole(user) || isAuditor(user);
}

export function isAuditor(user: AuthUser | null): boolean {
  return user?.role === "auditor";
}

export function canViewFinance(user: AuthUser | null): boolean {
  return isAdminOrAbove(user) || isAuditor(user);
}
