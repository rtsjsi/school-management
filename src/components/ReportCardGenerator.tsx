"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PdfIcon } from "@/components/ui/export-icons";
import { Download, FileText, Users, Loader2 } from "lucide-react";
import JSZip from "jszip";
import { generateReportCardPDF, generateMultiExamReportCardPDF } from "@/lib/report-card-pdf";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { fetchAcademicYears, AcademicYearOption } from "@/lib/lov";

type Exam = { id: string; name: string; standard: string | null; term: string | null; academic_year_id: string | null };
type Student = { id: string; full_name: string; standard: string | null; division: string | null; roll_number?: number; gr_number?: string };
type Subject = { id: string; name: string; evaluation_type?: string; sort_order?: number; max_marks?: number | null };
type ExamResultSubject = { student_id: string; subject_id: string; score: number | null; max_score: number | null; grade: string | null; is_absent: boolean };

type AllowedClassNames = { standardName: string; divisionName: string }[];
type ReportType = "single" | "term-1" | "term-2" | "annual";

export default function ReportCardGenerator({ allowedClassNames }: { allowedClassNames?: AllowedClassNames } = {}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [reportType, setReportType] = useState<ReportType>("single");
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
      .order("term", { ascending: true })
      .order("name", { ascending: true })
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
    if (reportType === "single" && selectedExamId) {
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
  }, [standardFilter, divisionFilter, exams, students, selectedExamId, selectedStudentId, reportType]);

  const getTargetExams = () => {
    if (reportType === "single") {
      const exam = exams.find((e) => e.id === selectedExamId);
      return exam ? [exam] : [];
    }
    const filtered = exams.filter((e) => standardFilter === "all" || e.standard === standardFilter || !e.standard);
    if (reportType === "term-1") return filtered.filter(e => e.term === "Term-1");
    if (reportType === "term-2") return filtered.filter(e => e.term === "Term-2");
    return filtered; // annual
  };

  const getReportTitle = () => {
    if (reportType === "term-1") return "Term 1 Report Card";
    if (reportType === "term-2") return "Term 2 Report Card";
    return "Annual Report Card";
  };

  const fetchMultiExamData = async (targetExams: Exam[], targetStudents: Student[]) => {
    const examIds = targetExams.map(e => e.id);
    const studentIds = targetStudents.map(s => s.id);

    const { data: examSubsData } = await supabase
      .from("exam_subjects")
      .select(`
        exam_id,
        subject_id,
        max_marks,
        subjects (id, name, evaluation_type, sort_order)
      `)
      .in("exam_id", examIds);

    const validSubs = (examSubsData ?? []).filter((r: any) => r.subjects);
    
    const subjectMap = new Map<string, Subject>();
    const examMaxMap = new Map<string, number>(); 
    
    validSubs.forEach((r: any) => {
      if (!subjectMap.has(r.subject_id)) {
        subjectMap.set(r.subject_id, r.subjects);
      }
      examMaxMap.set(`${r.exam_id}_${r.subject_id}`, Number(r.max_marks));
    });

    const subjectList = Array.from(subjectMap.values());
    subjectList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    const { data: allMarks } = await supabase
      .from("exam_result_subjects")
      .select("student_id, exam_id, subject_id, score, max_score, grade, is_absent")
      .in("exam_id", examIds)
      .in("student_id", studentIds);

    const rows = (allMarks ?? []) as (ExamResultSubject & { exam_id: string })[];
    
    return { subjectList, examMaxMap, rows };
  };

  const handleGenerate = async () => {
    const targetExams = getTargetExams();
    if (targetExams.length === 0) {
      setError(reportType === "single" ? "Select an exam." : "No exams found for this class.");
      return;
    }
    if (!selectedStudentId) {
      setError("Select student.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const student = students.find((s) => s.id === selectedStudentId);
      if (!student) throw new Error("Student not found.");

      const { subjectList, examMaxMap, rows } = await fetchMultiExamData(targetExams, [student]);

      let pdfBlob: Blob;
      const acYear = academicYears.find(y => y.id === targetExams[0]?.academic_year_id)?.name;

      if (reportType === "single") {
        const exam = targetExams[0];
        const reportSubjects = subjectList.map((sub) => {
          const row = rows.find((r) => r.subject_id === sub.id && r.exam_id === exam.id);
          const isGradeBased = sub.evaluation_type === "grade";
          const maxScore = isGradeBased ? 0 : (row?.max_score ?? examMaxMap.get(`${exam.id}_${sub.id}`) ?? 100);
          return {
            subjectName: sub.name,
            maxScore: Number(maxScore),
            score: row?.is_absent ? null : (isGradeBased ? null : (row?.score ?? null)),
            grade: row?.is_absent ? null : (isGradeBased ? (row?.grade ?? null) : null),
            isAbsent: row?.is_absent ?? false,
          };
        });
        pdfBlob = await generateReportCardPDF({
          schoolName: school.name,
          schoolAddress: school.address,
          schoolLogoUrl: school.logoUrl ?? undefined,
          principalSignatureUrl: school.principalSignatureUrl ?? undefined,
          studentName: student.full_name,
          standard: student.standard ?? undefined,
          division: student.division ?? undefined,
          rollNumber: student.roll_number,
          studentId: student.gr_number,
          academicYear: acYear,
          examName: exam.name,
          subjects: reportSubjects,
        });
      } else {
        const reportSubjects = subjectList.map((sub) => {
          const isGradeBased = sub.evaluation_type === "grade";
          const examsData = targetExams.map(ex => {
            const row = rows.find(r => r.subject_id === sub.id && r.exam_id === ex.id);
            const maxScore = isGradeBased ? 0 : (row?.max_score ?? examMaxMap.get(`${ex.id}_${sub.id}`) ?? 100);
            return {
              examId: ex.id,
              score: row?.is_absent ? null : (isGradeBased ? null : (row?.score ?? null)),
              maxScore: Number(maxScore),
              grade: row?.is_absent ? null : (isGradeBased ? (row?.grade ?? null) : null),
              isAbsent: row?.is_absent ?? false,
              isGradeBased
            };
          });

          let totalScore: number | null = null;
          let totalMax = 0;
          let anyMarksFound = false;

          if (!isGradeBased) {
            totalScore = 0;
            examsData.forEach(ed => {
              if (examMaxMap.has(`${ed.examId}_${sub.id}`)) {
                totalMax += ed.maxScore;
                if (!ed.isAbsent && ed.score != null) {
                  totalScore = (totalScore ?? 0) + ed.score;
                  anyMarksFound = true;
                }
              }
            });
            if (!anyMarksFound) totalScore = null;
          }

          return {
            subjectName: sub.name,
            exams: examsData,
            totalScore,
            totalMax,
            finalGrade: isGradeBased ? (examsData.slice(-1)[0]?.grade ?? null) : null
          };
        });

        pdfBlob = await generateMultiExamReportCardPDF({
          schoolName: school.name,
          schoolAddress: school.address,
          schoolLogoUrl: school.logoUrl ?? undefined,
          principalSignatureUrl: school.principalSignatureUrl ?? undefined,
          studentName: student.full_name,
          standard: student.standard ?? undefined,
          division: student.division ?? undefined,
          rollNumber: student.roll_number,
          studentId: student.gr_number,
          academicYear: acYear,
          reportTitle: getReportTitle(),
          exams: targetExams.map(e => ({ id: e.id, name: e.name })),
          subjects: reportSubjects,
        });
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      const fileNameSuffix = reportType === "single" ? targetExams[0].name : reportType;
      a.download = `report_card_${student.full_name.replace(/\s+/g, "_")}_${fileNameSuffix.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report card");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateZip = async () => {
    const targetExams = getTargetExams();
    if (targetExams.length === 0) {
      setError(reportType === "single" ? "Select an exam." : "No exams found for this class.");
      return;
    }
    if (standardFilter === "all") {
      setError("Select a standard to download class ZIP.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const classStudents = students.filter(s => {
        if (standardFilter !== "all" && s.standard !== standardFilter) return false;
        if (divisionFilter !== "all" && s.division !== divisionFilter) return false;
        return true;
      });

      if (classStudents.length === 0) {
        throw new Error("No students found in this class.");
      }

      const { subjectList, examMaxMap, rows } = await fetchMultiExamData(targetExams, classStudents);
      const acYear = academicYears.find(y => y.id === targetExams[0]?.academic_year_id)?.name;

      const zip = new JSZip();

      for (const student of classStudents) {
        let pdfBlob: Blob;
        
        if (reportType === "single") {
          const exam = targetExams[0];
          const reportSubjects = subjectList.map((sub) => {
            const row = rows.find((r) => r.subject_id === sub.id && r.exam_id === exam.id && r.student_id === student.id);
            const isGradeBased = sub.evaluation_type === "grade";
            const maxScore = isGradeBased ? 0 : (row?.max_score ?? examMaxMap.get(`${exam.id}_${sub.id}`) ?? 100);
            return {
              subjectName: sub.name,
              maxScore: Number(maxScore),
              score: row?.is_absent ? null : (isGradeBased ? null : (row?.score ?? null)),
              grade: row?.is_absent ? null : (isGradeBased ? (row?.grade ?? null) : null),
              isAbsent: row?.is_absent ?? false,
            };
          });
          pdfBlob = await generateReportCardPDF({
            schoolName: school.name,
            schoolAddress: school.address,
            schoolLogoUrl: school.logoUrl ?? undefined,
            principalSignatureUrl: school.principalSignatureUrl ?? undefined,
            studentName: student.full_name,
            standard: student.standard ?? undefined,
            division: student.division ?? undefined,
            rollNumber: student.roll_number,
            studentId: student.gr_number,
            academicYear: acYear,
            examName: exam.name,
            subjects: reportSubjects,
          });
        } else {
          const reportSubjects = subjectList.map((sub) => {
            const isGradeBased = sub.evaluation_type === "grade";
            const examsData = targetExams.map(ex => {
              const row = rows.find(r => r.subject_id === sub.id && r.exam_id === ex.id && r.student_id === student.id);
              const maxScore = isGradeBased ? 0 : (row?.max_score ?? examMaxMap.get(`${ex.id}_${sub.id}`) ?? 100);
              return {
                examId: ex.id,
                score: row?.is_absent ? null : (isGradeBased ? null : (row?.score ?? null)),
                maxScore: Number(maxScore),
                grade: row?.is_absent ? null : (isGradeBased ? (row?.grade ?? null) : null),
                isAbsent: row?.is_absent ?? false,
                isGradeBased
              };
            });
  
            let totalScore: number | null = null;
            let totalMax = 0;
            let anyMarksFound = false;
  
            if (!isGradeBased) {
              totalScore = 0;
              examsData.forEach(ed => {
                if (examMaxMap.has(`${ed.examId}_${sub.id}`)) { 
                  totalMax += ed.maxScore;
                  if (!ed.isAbsent && ed.score != null) {
                    totalScore = (totalScore ?? 0) + ed.score;
                    anyMarksFound = true;
                  }
                }
              });
              if (!anyMarksFound) totalScore = null;
            }
  
            return {
              subjectName: sub.name,
              exams: examsData,
              totalScore,
              totalMax,
              finalGrade: isGradeBased ? (examsData.slice(-1)[0]?.grade ?? null) : null
            };
          });
  
          pdfBlob = await generateMultiExamReportCardPDF({
            schoolName: school.name,
            schoolAddress: school.address,
            schoolLogoUrl: school.logoUrl ?? undefined,
            principalSignatureUrl: school.principalSignatureUrl ?? undefined,
            studentName: student.full_name,
            standard: student.standard ?? undefined,
            division: student.division ?? undefined,
            rollNumber: student.roll_number,
            studentId: student.gr_number,
            academicYear: acYear,
            reportTitle: getReportTitle(),
            exams: targetExams.map(e => ({ id: e.id, name: e.name })),
            subjects: reportSubjects,
          });
        }

        const fileName = `${student.roll_number ?? "00"}_${student.full_name.replace(/\s+/g, "_")}.pdf`;
        zip.file(fileName, pdfBlob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const fileNameSuffix = reportType === "single" ? targetExams[0].name : reportType;
      a.download = `ReportCards_${standardFilter}${divisionFilter !== "all" ? `_${divisionFilter}` : ""}_${fileNameSuffix.replace(/\s+/g, "_")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate class ZIP");
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
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Report Card Generator</CardTitle>
            <CardDescription>Generate professional report cards for individual students or download a ZIP for the entire class.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-2.5 rounded-md border border-destructive/20">{error}</p>
        )}

        {/* ── Filter Section ── */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Filter</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Standard</Label>
              <Select value={standardFilter} onValueChange={setStandardFilter}>
                <SelectTrigger className="w-[120px] h-9">
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
            <div className="space-y-1.5">
              <Label className="text-xs">Division</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-[100px] h-9">
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
          </div>
        </div>

        <hr className="border-border/50" />

        {/* ── Report Configuration ── */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Report Configuration</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={(val: any) => setReportType(val)}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Exam</SelectItem>
                  <SelectItem value="term-1">Term 1 Report Card</SelectItem>
                  <SelectItem value="term-2">Term 2 Report Card</SelectItem>
                  <SelectItem value="annual">Annual Report Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "single" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Exam</Label>
                <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={standardFilter === "all" || divisionFilter === "all"}>
                  <SelectTrigger className="w-[240px] h-9">
                    <SelectValue placeholder={standardFilter === "all" || divisionFilter === "all" ? "Select Standard & Division" : "Select exam"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredExams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-[260px] h-9">
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
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            size="sm"
            className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm h-9 px-4"
            onClick={handleGenerate}
            disabled={loading || (reportType === "single" && !selectedExamId) || !selectedStudentId}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PdfIcon className="h-4 w-4" />}
            {loading ? "Generating..." : "Generate Report Card"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 shadow-sm h-9 px-4"
            onClick={handleGenerateZip}
            disabled={loading || (reportType === "single" && !selectedExamId) || standardFilter === "all"}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {loading ? "Generating ZIP..." : "Download Class (ZIP)"}
          </Button>
          {standardFilter !== "all" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} in selection
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
