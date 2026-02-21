"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYearId } from "@/lib/enrollment";

export type UpsertEnrollmentResult = { ok: true } | { ok: false; error: string };

export async function upsertCurrentEnrollment(
  studentId: string,
  gradeName: string,
  divisionName: string
): Promise<UpsertEnrollmentResult> {
  const supabase = await createClient();
  const ayId = await getActiveAcademicYearId();
  if (!ayId) return { ok: false, error: "No active academic year set." };

  const grade = gradeName?.trim();
  const division = divisionName?.trim();
  if (!grade || !division) return { ok: false, error: "Standard and division are required for enrollment." };

  const { data: gradeRow } = await supabase.from("standards").select("id").eq("name", grade).maybeSingle();
  if (!gradeRow) return { ok: false, error: `Standard "${grade}" not found.` };

  const { data: divisionRow } = await supabase
    .from("divisions")
    .select("id")
    .eq("standard_id", gradeRow.id)
    .eq("name", division)
    .maybeSingle();
  if (!divisionRow) return { ok: false, error: `Division "${division}" not found for grade ${grade}.` };

  const { data: existing } = await supabase
    .from("student_enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("academic_year_id", ayId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("student_enrollments")
      .update({ standard_id: gradeRow.id, division_id: divisionRow.id })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("student_enrollments").insert({
      student_id: studentId,
      academic_year_id: ayId,
      standard_id: gradeRow.id,
      division_id: divisionRow.id,
      status: "active",
    });
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
