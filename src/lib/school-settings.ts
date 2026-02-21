import { createClient } from "@/lib/supabase/server";

const SCHOOL_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export type SchoolSettings = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_path: string | null;
  principal_signature_path: string | null;
  created_at: string;
  updated_at: string;
};

export async function getSchoolSettings(): Promise<SchoolSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_settings")
    .select("*")
    .eq("id", SCHOOL_SETTINGS_ID)
    .maybeSingle();
  if (error || !data) return null;
  return data as SchoolSettings;
}

export async function getSchoolSettingsWithUrls(): Promise<{
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_path: string | null;
  principal_signature_path: string | null;
  logoUrl: string | null;
  principalSignatureUrl: string | null;
} | null> {
  const settings = await getSchoolSettings();
  if (!settings) return null;

  const supabase = await createClient();
  const bucket = "school-assets";
  const logoUrl = settings.logo_path
    ? supabase.storage.from(bucket).getPublicUrl(settings.logo_path).data.publicUrl
    : null;
  const principalSignatureUrl = settings.principal_signature_path
    ? supabase.storage.from(bucket).getPublicUrl(settings.principal_signature_path).data.publicUrl
    : null;

  return {
    name: settings.name || "School",
    address: settings.address || "",
    phone: settings.phone || "",
    email: settings.email || "",
    logo_path: settings.logo_path,
    principal_signature_path: settings.principal_signature_path,
    logoUrl,
    principalSignatureUrl,
  };
}
