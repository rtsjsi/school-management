"use server";

import { createAdminClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

export type CreateUserResult = { ok: true } | { ok: false; error: string };

export async function createUser(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): Promise<CreateUserResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server configuration error (missing service role key)." };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();

  if (!trimmedEmail) return { ok: false, error: "Email is required." };
  if (!password || password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: trimmedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: trimmedName },
  });

  if (createError) {
    return { ok: false, error: createError.message };
  }

  if (!newUser.user) {
    return { ok: false, error: "User was not created." };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role, full_name: trimmedName || null })
    .eq("id", newUser.user.id);

  if (updateError) {
    return { ok: false, error: `User created but role update failed: ${updateError.message}` };
  }

  return { ok: true };
}

export type ResetPasswordResult = { ok: true } | { ok: false; error: string };

export async function resetUserPassword(userId: string, newPassword: string): Promise<ResetPasswordResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server configuration error (missing service role key)." };
  }

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
