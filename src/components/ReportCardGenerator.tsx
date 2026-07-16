"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PdfIcon } from "@/components/ui/export-icons";
import { generateReportCardPDF } from "@/lib/report-card-pdf";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { fetchAcademicYears, AcademicYearOption } from "@/lib/lov";

type Exam = { id: string; name: string; standard: string | null; term: string | null; academic_year_id: string | null };
type Student = { id: string; full_name: string; standard: string | null; division: string | null; roll_number?: number; gr_number?: string };
type Subject = { id: string; name: string; evaluation_type?: string; max_marks?: number | null };
type ExamResultSubject = { student_id: string; subject_id: string; score: number | null; max_score: number | null; grade: string | null; is_absent: boolean };

type AllowedClassNames = { standardName: string; divisionName: string }[];

export default function ReportCardGenerator({ allowedClassNames }: { allowedClassNames?: AllowedClassNames } = {}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [standardFilter, setStandardFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [classNames, setClassNames] = useState<string[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
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
    fetchAcademicYears().then(setAcademicYears);
    
    supabase
      .from("exams")
      .select("id, name, standard, term, academic_year_id")
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
      .select("id, full_name, standard, division, roll_number, gr_number")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => {
        let list = (data ?? []) as unknown as Student[];
        if (allowedPairSet) list = list.filter((s) => allowedPairSet.has(`${s.standard ?? ""}\0${s.division ?? ""}`));
        setStudents(list);
      });
  }, [supabase, allowedPairSet]);

  useEffect(() => {
    if (allowedStandardSet) {
      setClassNames(Array.from(allowedStandardSet));
    } else {
      supabase
        .from("standards")
        .select("name")
        .order("sort_order")
        .then(({ data }) => setClassNames((data ?? []).map((c: { name: string }) => c.name)));
    }
  }, [supabase, allowedStandardSet]);

  useEffect(() => {
    if (selectedExamId) {
      const exam = exams.find(e => e.id === selectedExamId);
      if (exam && standardFilter !== "all" && exam.standard && exam.standard !== standardFilter) {
        setSelectedExamId("");
      }
    }
    if (selectedStudentId) {
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        if (standardFilter !== "all" && student.standard !== standardFilter) {
          setSelectedStudentId("");
        } else if (divisionFilter !== "all" && student.division !== divisionFilter) {
          setSelectedStudentId("");
        }
      }
    }
  }, [standardFilter, divisionFilter, exams, students, selectedExamId, selectedStudentId]);

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

      let subjectList: Subject[] = [];
      const examMaxMap: Record<string, number> = {};

      const { data: examSubsData } = await supabase
        .from("exam_subjects")
        .select(`
          subject_id,
          max_marks,
          subjects (id, name, evaluation_type, sort_order)
        `)
        .eq("exam_id", selectedExamId);

      if (examSubsData) {
        const validSubs = examSubsData.filter((r: any) => r.subjects);
        validSubs.sort((a: any, b: any) => (a.subjects.sort_order || 0) - (b.subjects.sort_order || 0));
        subjectList = validSubs.map((r: any) => r.subjects) as Subject[];
        
        validSubs.forEach((r: any) => {
          examMaxMap[r.subject_id] = Number(r.max_marks);
        });
      }

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

      const examAcYearId = exam.academic_year_id;
      const acYear = academicYears.find(y => y.id === examAcYearId)?.name;

      const pdfBlob = generateReportCardPDF({
        schoolName: school.name,
        schoolAddress: school.address,
        studentName: student.full_name,
        standard: student.standard ?? undefined,
        division: student.division ?? undefined,
        rollNumber: student.roll_number,
        studentId: student.gr_number,
        academicYear: acYear,
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

  const filteredExams = exams.filter((e) => standardFilter === "all" || e.standard === standardFilter || !e.standard);
  const divisions = Array.from(new Set(students.filter(s => standardFilter === "all" || s.standard === standardFilter).map((s) => s.division).filter(Boolean))) as string[];
  const filteredStudents = students.filter((s) => {
    if (standardFilter !== "all" && s.standard !== standardFilter) return false;
    if (divisionFilter !== "all" && s.division !== divisionFilter) return false;
    return true;
  });

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
        )}

        <div className="flex flex-wrap gap-4 items-end pb-2">
          <div className="space-y-2">
            <Label>Standard</Label>
            <Select value={standardFilter} onValueChange={setStandardFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {classNames.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Division</Label>
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Exam</Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {filteredExams.map((e) => (
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
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} {s.standard && s.division ? `(${s.standard} ${s.division})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={handleGenerate} disabled={loading || !selectedExamId || !selectedStudentId}>
          <PdfIcon className="h-4 w-4" />
          {loading ? "Generating…" : "Generate Report Card"}
        </Button>
      </CardContent>
    </Card>
  );
}
