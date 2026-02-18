"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateReportCardPDF } from "@/lib/report-card-pdf";
import { FileDown } from "lucide-react";

type Exam = { id: string; name: string; exam_type: string; grade: string | null; held_at: string };
type Student = { id: string; full_name: string; grade: string | null; section: string | null; roll_number?: number; student_id?: string; academic_year?: string };
type Subject = { id: string; name: string };
type ExamResultSubject = { student_id: string; subject_id: string; score: number | null; max_score: number | null; is_absent: boolean };

export default function ReportCardGenerator() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("exams")
      .select("id, name, exam_type, grade, held_at")
      .order("held_at", { ascending: false })
      .then(({ data }) => setExams(data ?? []));
    supabase
      .from("subjects")
      .select("id, name")
      .order("sort_order")
      .then(({ data }) => setSubjects(data ?? []));
  }, [supabase]);

  useEffect(() => {
    supabase
      .from("students")
      .select("id, full_name, grade, section, roll_number, student_id, academic_year")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setStudents((data ?? []) as Student[]));
  }, [supabase]);

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

      const { data: marks } = await supabase
        .from("exam_result_subjects")
        .select("student_id, subject_id, score, max_score, is_absent")
        .eq("exam_id", selectedExamId)
        .eq("student_id", selectedStudentId);

      const rows = (marks ?? []) as ExamResultSubject[];

      const reportSubjects = subjects.map((sub) => {
        const row = rows.find((r) => r.subject_id === sub.id);
        const maxScore = row?.max_score ?? 100;
        return {
          subjectName: sub.name,
          maxScore: Number(maxScore),
          score: row?.is_absent ? null : (row?.score ?? null),
          isAbsent: row?.is_absent ?? false,
        };
      });

      const pdfBlob = generateReportCardPDF({
        schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "School",
        schoolAddress: process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "",
        studentName: student.full_name,
        grade: student.grade ?? undefined,
        section: student.section ?? undefined,
        rollNumber: student.roll_number,
        studentId: student.student_id,
        academicYear: student.academic_year as string | undefined,
        examName: exam.name,
        examType: exam.exam_type,
        heldAt: exam.held_at,
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Report Card
        </CardTitle>
        <CardDescription>
          Generate and download report card PDF for a student based on exam marks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    {e.name} ({e.exam_type}) – {e.held_at ? new Date(e.held_at).toLocaleDateString() : ""}
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
                    {s.full_name} {s.grade && s.section ? `(${s.grade} ${s.section})` : ""}
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
