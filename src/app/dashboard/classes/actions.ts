"use server";

import { createClient } from "@/lib/supabase/server";

export type SubjectActionResult = { ok: true } | { ok: false; error: string };

export async function createSubject(
  classId: string,
  name: string,
  evaluationType: "grade" | "mark"
): Promise<SubjectActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Subject name is required." };

  const { error } = await supabase.from("subjects").insert({
    class_id: classId,
    name: trimmed,
    evaluation_type: evaluationType,
    sort_order: 999,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateSubject(
  id: string,
  name: string,
  evaluationType: "grade" | "mark"
): Promise<SubjectActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Subject name is required." };

  const { error } = await supabase
    .from("subjects")
    .update({ name: trimmed, evaluation_type: evaluationType })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type ClassActionResult = { ok: true } | { ok: false; error: string };

export async function createClass(name: string, section: string): Promise<ClassActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Class name is required." };
  const validSections = ["pre_primary", "primary", "secondary", "higher_secondary"];
  if (!validSections.includes(section)) return { ok: false, error: "Invalid section." };

  const { data: classes } = await supabase.from("classes").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextOrder = classes?.[0]?.sort_order != null ? classes[0].sort_order + 1 : 0;

  const { error } = await supabase.from("classes").insert({
    name: trimmed,
    section,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateClass(id: string, name: string, section: string): Promise<ClassActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Class name is required." };
  const validSections = ["pre_primary", "primary", "secondary", "higher_secondary"];
  if (!validSections.includes(section)) return { ok: false, error: "Invalid section." };

  const { error } = await supabase.from("classes").update({ name: trimmed, section }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteClass(id: string): Promise<ClassActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<SubjectActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type DivisionActionResult = { ok: true } | { ok: false; error: string };

export async function createDivision(classId: string, name: string): Promise<DivisionActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Division name is required." };

  const { data: existing } = await supabase
    .from("class_divisions")
    .select("sort_order")
    .eq("class_id", classId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = existing?.sort_order != null ? existing.sort_order + 1 : 0;

  const { error } = await supabase.from("class_divisions").insert({
    class_id: classId,
    name: trimmed,
    sort_order: nextOrder,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteDivision(id: string): Promise<DivisionActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("class_divisions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
