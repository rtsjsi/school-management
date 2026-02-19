"use server";

import { createClient } from "@/lib/supabase/server";

export type SubjectActionResult = { ok: true } | { ok: false; error: string };

export async function createSubject(
  classId: string,
  name: string,
  evaluationType: "grade" | "mark",
  maxMarks: number | null
): Promise<SubjectActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Subject name is required." };
  if (evaluationType === "mark" && (maxMarks == null || maxMarks <= 0)) {
    return { ok: false, error: "Max marks is required for mark-based evaluation." };
  }

  const { error } = await supabase.from("subjects").insert({
    class_id: classId,
    name: trimmed,
    evaluation_type: evaluationType,
    max_marks: evaluationType === "mark" ? maxMarks : null,
    sort_order: 999,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateSubject(
  id: string,
  name: string,
  evaluationType: "grade" | "mark",
  maxMarks: number | null
): Promise<SubjectActionResult> {
  const supabase = await createClient();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Subject name is required." };
  if (evaluationType === "mark" && (maxMarks == null || maxMarks <= 0)) {
    return { ok: false, error: "Max marks is required for mark-based evaluation." };
  }

  const { error } = await supabase
    .from("subjects")
    .update({
      name: trimmed,
      evaluation_type: evaluationType,
      max_marks: evaluationType === "mark" ? maxMarks : null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSubject(id: string): Promise<SubjectActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
