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
