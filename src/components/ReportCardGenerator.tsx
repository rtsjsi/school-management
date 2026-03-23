"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { generateReportCardPDF } from "@/lib/report-card-pdf";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

type Exam = { id: string; name: string; standard: string | null; term: string | null };
type Student = { id: string; full_name: string; standard: string | null; division: string | null; roll_number?: number; student_id?: string; academic_year?: string };
type Subject = { id: string; name: string; evaluation_type?: string; max_marks?: number | null };
type ExamResultSubject = { student_id: string; subject_id: string; score: number | null; max_score: number | null; grade: string | null; is_absent: boolean };

type AllowedClassNames = { standardName: string; divisionName: string }[];

export default function ReportCardGenerator({ allowedClassNames }: { allowedClassNames?: AllowedClassNames } = {}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const school = useSchoolSettings();
  const allowedStandardSet = useMemo(
    () => (allowedClassNames?.length ? new Set(allowedClassNames.map((p) => p.standardName)) : null),
    [allowedClassNames]
  );
  const allowedPairSet = useMemo(
    () =>
      allowedClassNames?.length
        ? new Set(allowedClassNames.map((p) => `${p.standardName}\0${p.divisionName}`))
        : null,
    [allowedClassNames]
  );

  useEffect(() => {
    supabase
      .from("exams")
      .select("id, name, standard, term")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        let list = (data ?? []) as Exam[];
        if (allowedStandardSet) list = list.filter((e) => e.standard && allowedStandardSet.has(e.standard));
        setExams(list);
      });
  }, [supabase, allowedStandardSet]);

  useEffect(() => {
    supabase
      .from("students")
      .select("id, full_name, standard, division, roll_number, student_id, academic_year")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => {
        let list = (data ?? []) as unknown as Student[];
        if (allowedPairSet) list = list.filter((s) => allowedPairSet.has(`${s.standard ?? ""}\0${s.division ?? ""}`));
        setStudents(list);
      });
  }, [supabase, allowedPairSet]);

  const handleGenerate = async () => {
    if (!selectedExamId || !selectedStudentId) {
      setError("Select exam and student.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const exam = exams.find((e) => e.id === selectedExamId);
      const student = students.find((s) => s.id === selectedStudentId);
      if (!exam || !student) {
        setError("Exam or student not found.");
        return;
      }

      const studentStandard = student.standard;
      let subjectList: Subject[] = [];
      if (studentStandard) {
        const { data: classRow } = await supabase
          .from("standards")
          .select("id")
          .eq("name", studentStandard)
          .maybeSingle();
        if (classRow?.id) {
          const { data: subData } = await supabase
            .from("subjects")
            .select("id, name, evaluation_type")
            .eq("standard_id", classRow.id)
            .order("sort_order");
          subjectList = (subData ?? []) as Subject[];
        }
      }

      const { data: examSubs } = await supabase
        .from("exam_subjects")
        .select("subject_id, max_marks")
        .eq("exam_id", selectedExamId);
      const examMaxMap: Record<string, number> = {};
      (examSubs ?? []).forEach((r: { subject_id: string; max_marks: number }) => {
        examMaxMap[r.subject_id] = Number(r.max_marks);
      });

      const { data: marks } = await supabase
        .from("exam_result_subjects")
        .select("student_id, subject_id, score, max_score, grade, is_absent")
        .eq("exam_id", selectedExamId)
        .eq("student_id", selectedStudentId);

      const rows = (marks ?? []) as ExamResultSubject[];

      const reportSubjects = subjectList.map((sub) => {
        const row = rows.find((r) => r.subject_id === sub.id);
        const isGradeBased = sub.evaluation_type === "grade";
        const maxScore = isGradeBased ? 0 : (row?.max_score ?? examMaxMap[sub.id] ?? 100);
        return {
          subjectName: sub.name,
          maxScore: Number(maxScore),
          score: row?.is_absent ? null : (isGradeBased ? null : (row?.score ?? null)),
          grade: row?.is_absent ? null : (isGradeBased ? (row?.grade ?? null) : null),
          isAbsent: row?.is_absent ?? false,
        };
      });

      const pdfBlob = generateReportCardPDF({
        schoolName: school.name,
        schoolAddress: school.address,
        studentName: student.full_name,
        standard: student.standard ?? undefined,
        division: student.division ?? undefined,
        rollNumber: student.roll_number,
        studentId: student.student_id,
        academicYear: student.academic_year as string | undefined,
        examName: exam.name,
        subjects: reportSubjects,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_card_${student.full_name.replace(/\s+/g, "_")}_${exam.name.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Exam</Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} – {e.term ?? "No term"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} {s.standard && s.division ? `(${s.standard} ${s.division})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading || !selectedExamId || !selectedStudentId}>
          {loading ? "Generating…" : "Generate Report Card PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}
