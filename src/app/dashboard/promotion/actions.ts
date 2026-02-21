"use server";

import { createClient } from "@/lib/supabase/server";
import { getNextGradeId, isHighestGrade } from "@/lib/enrollment";

export type EnrollmentOutcome = {
  enrollmentId: string;
  studentId: string;
  gradeId: string;
  studentName: string;
  gradeName: string;
  divisionName: string;
  status: "promoted" | "detained" | "graduated" | "manual";
  nextGradeId: string | null;
  nextGradeName: string | null;
};

const PASS_PERCENTAGE = 40;

export async function getEnrollmentsForYear(academicYearId: string): Promise<EnrollmentOutcome[]> {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("id, student_id, grade_id, division_id")
    .eq("academic_year_id", academicYearId)
    .eq("status", "active");

  if (!enrollments?.length) return [];
  const outcomes: EnrollmentOutcome[] = [];
  for (const e of enrollments) {
    const [g, d, s] = await Promise.all([
      supabase.from("grades").select("name").eq("id", e.grade_id).single(),
      supabase.from("divisions").select("name").eq("id", e.division_id).single(),
      supabase.from("students").select("full_name").eq("id", e.student_id).single(),
    ]);
    outcomes.push({
      enrollmentId: e.id,
      studentId: e.student_id,
      gradeId: e.grade_id,
      studentName: (s.data?.full_name as string) ?? "",
      gradeName: (g.data?.name as string) ?? "",
      divisionName: (d.data?.name as string) ?? "",
      status: "manual",
      nextGradeId: null,
      nextGradeName: null,
    });
  }
  return outcomes;
}

export async function computeOutcomesFromExam(
  academicYearId: string,
  examId: string
): Promise<EnrollmentOutcome[]> {
  const supabase = await createClient();
  const { data: examRows } = await supabase
    .from("exam_result_subjects")
    .select("student_id, score, max_score, is_absent")
    .eq("exam_id", examId);

  const byStudent = new Map<string, { total: number; max: number; absent: boolean }>();
  for (const r of examRows ?? []) {
    const cur = byStudent.get(r.student_id) ?? { total: 0, max: 0, absent: false };
    cur.total += Number(r.score) || 0;
    cur.max += Number(r.max_score) || 0;
    if (r.is_absent) cur.absent = true;
    byStudent.set(r.student_id, cur);
  }

  const enrollments = await getEnrollmentsForYear(academicYearId);
  const results: EnrollmentOutcome[] = [];
  for (const o of enrollments) {
    const marks = byStudent.get(o.studentId);
    const highest = await isHighestGrade(o.gradeId);
    if (highest && marks && marks.max > 0 && marks.total / marks.max >= PASS_PERCENTAGE / 100 && !marks.absent) {
      o.status = "graduated";
      o.nextGradeId = null;
      o.nextGradeName = null;
    } else if (marks && marks.max > 0 && marks.total / marks.max >= PASS_PERCENTAGE / 100 && !marks.absent) {
      o.status = "promoted";
      const nextId = await getNextGradeId(o.gradeId);
      let nextName: string | null = null;
      if (nextId) {
        const { data } = await supabase.from("grades").select("name").eq("id", nextId).single();
        nextName = data?.name ?? null;
      }
      o.nextGradeId = nextId;
      o.nextGradeName = nextName;
    } else {
      o.status = "detained";
      o.nextGradeId = o.gradeId;
      o.nextGradeName = o.gradeName;
    }
    results.push(o);
  }
  return results;
}

export type RunPromotionResult = { ok: true } | { ok: false; error: string };

export async function runPromotion(
  academicYearId: string,
  outcomes: EnrollmentOutcome[]
): Promise<RunPromotionResult> {
  const supabase = await createClient();

  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("sort_order")
    .eq("id", academicYearId)
    .single();
  const currentOrder = currentYear?.sort_order ?? 0;
  const { data: nextYear } = await supabase
    .from("academic_years")
    .select("id")
    .gt("sort_order", currentOrder)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  const nextYearId = nextYear?.id;
  if (!nextYearId) return { ok: false, error: "Next academic year not found. Add the next year (e.g. 2025-26) first." };

  for (const o of outcomes) {
    const { error: updateErr } = await supabase
      .from("student_enrollments")
      .update({ status: o.status })
      .eq("id", o.enrollmentId)
      .eq("status", "active");
    if (updateErr) return { ok: false, error: updateErr.message };
  }

  const toCreate = outcomes.filter((o) => (o.status === "promoted" || o.status === "detained") && o.nextGradeId);
  for (const o of toCreate) {
    const { data: existing } = await supabase
      .from("student_enrollments")
      .select("id")
      .eq("student_id", o.studentId)
      .eq("academic_year_id", nextYearId)
      .maybeSingle();
    if (existing) continue;

    const { data: divisions } = await supabase
      .from("divisions")
      .select("id")
      .eq("grade_id", o.nextGradeId)
      .order("sort_order")
      .limit(1);
    const divisionId = divisions?.[0]?.id;
    if (!divisionId) return { ok: false, error: `No division for grade ${o.nextGradeName}.` };

    const { error: insertErr } = await supabase.from("student_enrollments").insert({
      student_id: o.studentId,
      academic_year_id: nextYearId,
      grade_id: o.nextGradeId,
      division_id: divisionId,
      status: "active",
      promoted_from_enrollment_id: o.enrollmentId,
    });
    if (insertErr) return { ok: false, error: insertErr.message };
  }

  await supabase.from("academic_years").update({ is_active: false }).eq("id", academicYearId);
  await supabase.from("academic_years").update({ is_active: true }).eq("id", nextYearId);
  return { ok: true };
}
