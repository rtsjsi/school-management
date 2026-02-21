"use server";

import { createClient } from "@/lib/supabase/server";

export type ExamSubjectActionResult = { ok: true } | { ok: false; error: string };

export async function setExamSubjectMaxMarks(
  examId: string,
  subjectId: string,
  maxMarks: number
): Promise<ExamSubjectActionResult> {
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
    exam_type: string;
    held_at: string;
    description?: string | null;
    grade: string | null;
    subjectMaxMarks: { subjectId: string; maxMarks: number }[];
  }
): Promise<CreateExamResult> {
  const supabase = await createClient();
  if (!payload.name.trim()) return { ok: false, error: "Exam name is required." };
  if (!payload.held_at) return { ok: false, error: "Date is required." };

  const { data: exam, error: examErr } = await supabase
    .from("exams")
    .insert({
      name: payload.name.trim(),
      exam_type: payload.exam_type,
      subject: null,
      grade: payload.grade?.trim() || null,
      held_at: payload.held_at,
      description: payload.description?.trim() || null,
    })
    .select("id")
    .single();

  if (examErr || !exam) return { ok: false, error: examErr?.message ?? "Failed to create exam." };

  for (const { subjectId, maxMarks } of payload.subjectMaxMarks) {
    if (maxMarks <= 0) continue;
    await supabase
      .from("exam_subjects")
      .upsert({ exam_id: exam.id, subject_id: subjectId, max_marks: maxMarks }, { onConflict: "exam_id,subject_id" });
  }

  return { ok: true, examId: exam.id };
}
