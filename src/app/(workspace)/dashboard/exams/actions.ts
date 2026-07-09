"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser, isAdminOrAbove } from "@/lib/auth";

export type ExamSubjectActionResult = { ok: true } | { ok: false; error: string };

export async function setExamSubjectMaxMarks(
  examId: string,
  subjectId: string,
  maxMarks: number
): Promise<ExamSubjectActionResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  if (maxMarks <= 0) return { ok: false, error: "Max marks must be positive." };

  const { error } = await supabase
    .from("exam_subjects")
    .upsert({ exam_id: examId, subject_id: subjectId, max_marks: maxMarks }, { onConflict: "exam_id,subject_id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type CreateExamResult = { ok: true; examId: string } | { ok: false; error: string };

export async function createExamWithSubjects(
  payload: {
    name: string;
    term: string | null;
    standard: string | null;
    academic_year_id: string;
    subjectMaxMarks: { subjectId: string; maxMarks: number; passingMarks?: number | null }[];
  }
): Promise<CreateExamResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  if (!payload.name.trim()) return { ok: false, error: "Exam name is required." };
  if (!payload.academic_year_id?.trim()) return { ok: false, error: "Academic year is required." };

  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .insert({
      name: payload.name.trim(),
      term: payload.term,
      standard: payload.standard?.trim() || null,
      academic_year_id: payload.academic_year_id.trim(),
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (examErr || !exam) return { ok: false, error: examErr?.message ?? "Failed to create exam." };

  for (const { subjectId, maxMarks, passingMarks } of payload.subjectMaxMarks) {
    if (maxMarks <= 0) continue;
    await supabase
      .from("exam_subjects")
      .upsert(
        { exam_id: exam.id, subject_id: subjectId, max_marks: maxMarks, passing_marks: passingMarks ?? null },
        { onConflict: "exam_id,subject_id" }
      );
  }

  return { ok: true, examId: exam.id };
}

export type UpdateExamResult = { ok: true } | { ok: false; error: string };

export async function updateExam(
  examId: string,
  payload: {
    name: string;
    standard: string | null;
    term: string | null;
    subjectMaxMarks: { subjectId: string; maxMarks: number; passingMarks?: number | null }[];
  }
): Promise<UpdateExamResult> {
  const user = await requireUser();
  if (!isAdminOrAbove(user)) return { ok: false, error: "Unauthorized" };
  const supabase = await createClient();
  if (!payload.name.trim()) return { ok: false, error: "Exam name is required." };
  if (!payload.standard?.trim()) return { ok: false, error: "Standard is required." };
  if (!payload.term) return { ok: false, error: "Term is required." };

  const { error } = await supabase
    .from("exams")
    .update({
      name: payload.name.trim(),
      standard: payload.standard.trim(),
      term: payload.term,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", examId);

  if (error) return { ok: false, error: error.message };

  const selectedSubjectIds = payload.subjectMaxMarks.map(s => s.subjectId);
  if (selectedSubjectIds.length > 0) {
    await supabase.from("exam_subjects").delete().eq("exam_id", examId).not("subject_id", "in", `(${selectedSubjectIds.join(",")})`);
  } else {
    await supabase.from("exam_subjects").delete().eq("exam_id", examId);
  }

  for (const { subjectId, maxMarks, passingMarks } of payload.subjectMaxMarks) {
    if (maxMarks <= 0 && passingMarks == null) continue; // Note: For grade subjects maxMarks is 100 artificially, but we should insert them too. In ExamEntry it passes 100.
    await supabase
      .from("exam_subjects")
      .upsert(
        { exam_id: examId, subject_id: subjectId, max_marks: maxMarks, passing_marks: passingMarks ?? null },
        { onConflict: "exam_id,subject_id" }
      );
  }

  return { ok: true };
}
