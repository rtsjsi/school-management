"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser, isPrincipal } from "@/lib/auth";

export type AllowedClassPair = { standardId: string; divisionId: string };

export async function getProfileAllowedClasses(profileId: string): Promise<AllowedClassPair[]> {
  const user = await getUser();
  if (!isPrincipal(user)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_allowed_classes")
    .select("standard_id, division_id")
    .eq("profile_id", profileId);
  return (data ?? [])
    .filter((r) => r.division_id)
    .map((r) => ({ standardId: r.standard_id, divisionId: r.division_id }));
}

export async function setProfileAllowedClasses(
  profileId: string,
  pairs: AllowedClassPair[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser();
  if (!isPrincipal(user)) return { ok: false, error: "Only Principal can manage class access." };
  const supabase = await createClient();
  await supabase.from("profile_allowed_classes").delete().eq("profile_id", profileId);
  if (pairs.length > 0) {
    const rows = pairs.map((p) => ({
      profile_id: profileId,
      standard_id: p.standardId,
      division_id: p.divisionId,
    }));
    const { error } = await supabase.from("profile_allowed_classes").insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
