"use server";

import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYearId } from "@/lib/enrollment";

export type UpsertEnrollmentResult = { ok: true } | { ok: false; error: string };

export async function upsertCurrentEnrollment(
  studentId: string,
  standardName: string,
  divisionName: string
): Promise<UpsertEnrollmentResult> {
  const supabase = await createClient();
  const ayId = await getActiveAcademicYearId();
  if (!ayId) return { ok: false, error: "No active academic year set." };

  const standard = standardName?.trim();
  const division = divisionName?.trim();
  if (!standard || !division) return { ok: false, error: "Standard and division are required for enrollment." };

  const { data: standardRow } = await supabase.from("standards").select("id").eq("name", standard).maybeSingle();
  if (!standardRow) return { ok: false, error: `Standard "${standard}" not found.` };

  const { data: divisionRow } = await supabase
    .from("standard_divisions")
    .select("id")
    .eq("standard_id", standardRow.id)
    .eq("name", division)
    .maybeSingle();
  if (!divisionRow) return { ok: false, error: `Division "${division}" not found for standard ${standard}.` };

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
      .update({ standard_id: standardRow.id, division_id: divisionRow.id })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("student_enrollments").insert({
      student_id: studentId,
      academic_year_id: ayId,
      standard_id: standardRow.id,
      division_id: divisionRow.id,
      status: "active",
    });
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function reenrollStudent(
  studentId: string,
  standardName: string,
  divisionName: string,
  rollNumber: number | null,
  reenrollmentDate: string,
  reenrollmentReason: string
): Promise<UpsertEnrollmentResult> {
  const supabase = await createClient();
  const ayId = await getActiveAcademicYearId();
  if (!ayId) return { ok: false, error: "No active academic year set." };

  const standard = standardName?.trim();
  const division = divisionName?.trim();
  if (!standard || !division) return { ok: false, error: "Standard and division are required for re-enrollment." };

  const { data: standardRow } = await supabase.from("standards").select("id").eq("name", standard).maybeSingle();
  if (!standardRow) return { ok: false, error: `Standard "${standard}" not found.` };

  const { data: divisionRow } = await supabase
    .from("standard_divisions")
    .select("id")
    .eq("standard_id", standardRow.id)
    .eq("name", division)
    .maybeSingle();
  if (!divisionRow) return { ok: false, error: `Division "${division}" not found for standard ${standard}.` };

  // Update the student record
  const { error: studentUpdateErr } = await supabase
    .from("students")
    .update({
      status: "active",
      standard,
      division,
      roll_number: rollNumber,
    })
    .eq("id", studentId);
  
  if (studentUpdateErr) return { ok: false, error: studentUpdateErr.message };

  // Create a new enrollment record for the active academic year
  // (or update if one already exists for some reason, but typically re-enrollment implies a new period)
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
      .update({ 
        standard_id: standardRow.id, 
        division_id: divisionRow.id,
        reenrollment_date: reenrollmentDate,
        reenrollment_reason: reenrollmentReason,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("student_enrollments").insert({
      student_id: studentId,
      academic_year_id: ayId,
      standard_id: standardRow.id,
      division_id: divisionRow.id,
      status: "active",
      reenrollment_date: reenrollmentDate,
      reenrollment_reason: reenrollmentReason,
    });
    if (error) return { ok: false, error: error.message };
  }
  
  return { ok: true };
}
