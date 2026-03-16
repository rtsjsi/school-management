"use server";

import { createClient } from "@/lib/supabase/server";

export type EnrollmentOutcome = {
  enrollmentId: string;
  studentId: string;
  standardId: string;
  studentName: string;
  standardName: string;
  divisionName: string;
  status: "promoted" | "retained" | "graduated" | "manual";
  nextStandardId: string | null;
  nextStandardName: string | null;
  nextDivisionId?: string | null;
  nextDivisionName?: string | null;
};

export async function getEnrollmentsForYear(academicYearId: string): Promise<EnrollmentOutcome[]> {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("id, student_id, standard_id, division_id")
    .eq("academic_year_id", academicYearId)
    .eq("status", "active");

  if (!enrollments?.length) return [];
  const outcomes: EnrollmentOutcome[] = [];
  for (const e of enrollments) {
    const [g, d, s] = await Promise.all([
      supabase.from("standards").select("name").eq("id", e.standard_id).single(),
      supabase.from("standard_divisions").select("name").eq("id", e.division_id).single(),
      supabase.from("students").select("full_name").eq("id", e.student_id).single(),
    ]);
    outcomes.push({
      enrollmentId: e.id,
      studentId: e.student_id,
      standardId: e.standard_id,
      studentName: (s.data?.full_name as string) ?? "",
      standardName: (g.data?.name as string) ?? "",
      divisionName: (d.data?.name as string) ?? "",
      status: "manual",
      nextStandardId: null,
      nextStandardName: null,
    });
  }
  return outcomes;
}

export async function getPromotionCandidates(academicYearId: string): Promise<EnrollmentOutcome[]> {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("id, student_id, standard_id, division_id")
    .eq("academic_year_id", academicYearId)
    .eq("status", "active");

  if (!enrollments?.length) return [];

  // Batch-load all related data and next-grade mapping to avoid N+1 queries
  const studentIds = Array.from(new Set(enrollments.map((e) => e.student_id)));
  const divisionIds = Array.from(new Set(enrollments.map((e) => e.division_id)));

  const [{ data: standards }, { data: divisions }, { data: students }] = await Promise.all([
    supabase.from("standards").select("id, name, sort_order").order("sort_order"),
    supabase.from("standard_divisions").select("id, name").in("id", divisionIds),
    supabase.from("students").select("id, full_name").in("id", studentIds),
  ]);

  const standardsList = standards ?? [];
  const divisionsById = new Map((divisions ?? []).map((d) => [d.id, d]));
  const studentsById = new Map((students ?? []).map((s) => [s.id, s]));
  const standardsById = new Map(standardsList.map((s) => [s.id, s]));

  // Pre-compute next-standard mapping and highest standard
  let maxSortOrder = -Infinity;
  const nextStandardById = new Map<string, string | null>();
  for (let i = 0; i < standardsList.length; i++) {
    const current = standardsList[i];
    maxSortOrder = Math.max(maxSortOrder, current.sort_order ?? 0);
    const next = standardsList[i + 1];
    nextStandardById.set(current.id, next ? next.id : null);
  }

  const outcomes: EnrollmentOutcome[] = [];
  for (const e of enrollments) {
    const std = standardsById.get(e.standard_id);
    const div = divisionsById.get(e.division_id);
    const stu = studentsById.get(e.student_id);

    const standardId = e.standard_id;
    const standardName = (std?.name as string) ?? "";
    const divisionName = (div?.name as string) ?? "";
    const studentName = (stu?.full_name as string) ?? "";

    const sortOrder = (std?.sort_order as number | null) ?? null;
    const isHighest = sortOrder !== null && sortOrder >= maxSortOrder;

    let status: EnrollmentOutcome["status"];
    let nextStandardId: string | null = null;
    let nextStandardName: string | null = null;

    if (isHighest) {
      status = "graduated";
    } else {
      status = "promoted";
      const nid = nextStandardById.get(standardId) ?? null;
      if (nid) {
        nextStandardId = nid;
        const nextStd = standardsById.get(nid);
        nextStandardName = (nextStd?.name as string) ?? null;
      }
    }

    outcomes.push({
      enrollmentId: e.id,
      studentId: e.student_id,
      standardId,
      studentName,
      standardName,
      divisionName,
      status,
      nextStandardId,
      nextStandardName,
    });
  }

  return outcomes;
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

  const toCreate = outcomes.filter((o) => (o.status === "promoted" || o.status === "retained") && o.nextStandardId);
  for (const o of toCreate) {
    const { data: existing } = await supabase
      .from("student_enrollments")
      .select("id")
      .eq("student_id", o.studentId)
      .eq("academic_year_id", nextYearId)
      .maybeSingle();
    if (existing) continue;

    const divisionId = o.nextDivisionId ?? null;
    if (!divisionId) {
      return { ok: false, error: `Next division is not set for student ${o.studentName}.` };
    }

    const { error: insertErr } = await supabase.from("student_enrollments").insert({
      student_id: o.studentId,
      academic_year_id: nextYearId,
      standard_id: o.nextStandardId,
      division_id: divisionId,
      status: "active",
      promoted_from_enrollment_id: o.enrollmentId,
    });
    if (insertErr) return { ok: false, error: insertErr.message };
  }

  // Update student master with new standard and division
  for (const o of outcomes) {
    if (!o.nextStandardName || !o.nextDivisionName) continue;
    const { error: studentErr } = await supabase
      .from("students")
      .update({ standard: o.nextStandardName, division: o.nextDivisionName })
      .eq("id", o.studentId);
    if (studentErr) return { ok: false, error: studentErr.message };
  }

  return { ok: true };
}
