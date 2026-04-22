"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser, isAdminOrAbove } from "@/lib/auth";

export type SubjectActionResult = { ok: true } | { ok: false; error: string };

export async function createSubject(
  standardId: string,
  name: string,
  evaluationType: "grade" | "mark",
  subjectTeacherId: string | null = null
): Promise<SubjectActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Subject name is required." };

  const { error } = await supabase.from("subjects").insert({
    standard_id: standardId,
    name: trimmed,
    evaluation_type: evaluationType,
    sort_order: 999,
    subject_teacher_id: subjectTeacherId || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateSubject(
  id: string,
  name: string,
  evaluationType: "grade" | "mark",
  subjectTeacherId: string | null = null
): Promise<SubjectActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Subject name is required." };

  const { error } = await supabase
    .from("subjects")
    .update({
      name: trimmed,
      evaluation_type: evaluationType,
      subject_teacher_id: subjectTeacherId || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type StandardActionResult = { ok: true } | { ok: false; error: string };

export async function createStandard(name: string, section: string): Promise<StandardActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Standard name is required." };
  const validSections = ["pre_primary", "primary", "secondary", "higher_secondary"];
  if (!validSections.includes(section)) return { ok: false, error: "Invalid section." };

  const { data: rows } = await supabase.from("standards").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextOrder = rows?.[0]?.sort_order != null ? rows[0].sort_order + 1 : 0;

  const { error } = await supabase.from("standards").insert({
    name: trimmed,
    section,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateStandard(id: string, name: string, section: string): Promise<StandardActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Standard name is required." };
  const validSections = ["pre_primary", "primary", "secondary", "higher_secondary"];
  if (!validSections.includes(section)) return { ok: false, error: "Invalid section." };

  const { error } = await supabase.from("standards").update({ name: trimmed, section }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteStandard(id: string): Promise<StandardActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { error } = await supabase.from("standards").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<SubjectActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type DivisionActionResult = { ok: true } | { ok: false; error: string };

export async function createDivision(standardId: string, name: string): Promise<DivisionActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Division name is required." };

  const { data: existing } = await supabase
    .from("standard_divisions")
    .select("sort_order")
    .eq("standard_id", standardId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = existing?.sort_order != null ? existing.sort_order + 1 : 0;

  const { error } = await supabase.from("standard_divisions").insert({
    standard_id: standardId,
    name: trimmed,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteDivision(id: string): Promise<DivisionActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  const { error } = await supabase.from("standard_divisions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
