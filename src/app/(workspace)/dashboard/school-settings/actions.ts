"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const SCHOOL_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export type SchoolSettingsUpdate = {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_path: string | null;
  principal_signature_path: string | null;
};

export type SchoolSettingsActionResult = { ok: true } | { ok: false; error: string };

export async function updateSchoolSettings(
  data: SchoolSettingsUpdate,
  isPrincipal: boolean
): Promise<SchoolSettingsActionResult> {
  if (!isPrincipal) return { ok: false, error: "Only Principal can update school settings." };

  const supabase = await createClient();
  const payload = {
    id: SCHOOL_SETTINGS_ID,
    name: data.name.trim() || "School",
    address: data.address.trim() || null,
    phone: data.phone.trim() || null,
    email: data.email.trim() || null,
    logo_path: data.logo_path || null,
    principal_signature_path: data.principal_signature_path || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("school_settings")
    .upsert(payload, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/school-settings");
  revalidatePath("/api/school-settings");
  return { ok: true };
}
