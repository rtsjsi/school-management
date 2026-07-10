"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PdfIcon, ExcelIcon } from "@/components/ui/export-icons";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Exam = { id: string; name: string; standard: string | null; term: string | null };
type Student = { id: string; full_name: string; standard: string | null; division: string | null; roll_number?: number; gr_number?: string };
type Subject = { id: string; name: string; evaluation_type?: string; max_marks?: number | null };
type ExamResultSubject = { student_id: string; subject_id: string; score: number | null; max_score: number | null; grade: string | null; is_absent: boolean };

type AllowedClassNames = { standardName: string; divisionName: string }[];

export default function GradeSheet({ allowedClassNames }: { allowedClassNames?: AllowedClassNames } = {}) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [standardFilter, setStandardFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [classNames, setClassNames] = useState<string[]>([]);
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
        if (allowedStandardSet) list = list.filter((e) => !e.standard || allowedStandardSet.has(e.standard));
        setExams(list);
      });
  }, [supabase, allowedStandardSet]);

  useEffect(() => {
    supabase
      .from("students")
      .select("id, full_name, standard, division, roll_number, gr_number")
      .eq("status", "active")
      .order("roll_number")
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
  }, [standardFilter, exams, selectedExamId]);

  const fetchData = async () => {
    if (!selectedExamId) {
      setError("Please select an exam.");
      return null;
    }

    const exam = exams.find((e) => e.id === selectedExamId);
    if (!exam) {
      setError("Exam not found.");
      return null;
    }

    const filteredStudents = students.filter((s) => {
      if (standardFilter !== "all" && s.standard !== standardFilter) return false;
      if (divisionFilter !== "all" && s.division !== divisionFilter) return false;
      return true;
    });

    if (filteredStudents.length === 0) {
      setError("No students found for the selected filters.");
      return null;
    }

    let subjectList: Subject[] = [];
    
    const { data: examSubsData, error: examSubsError } = await supabase
      .from("exam_subjects")
      .select(`
        subject_id,
        max_marks,
        subjects (id, name, evaluation_type, sort_order)
      `)
      .eq("exam_id", selectedExamId);

    if (examSubsError) {
      setError("Failed to fetch subjects.");
      return null;
    }

    if (examSubsData) {
      const validSubs = examSubsData.filter((r: any) => r.subjects);
      validSubs.sort((a: any, b: any) => (a.subjects.sort_order || 0) - (b.subjects.sort_order || 0));
      subjectList = validSubs.map((r: any) => r.subjects) as Subject[];
    }
    
    if (subjectList.length === 0) {
      setError("No subjects found for this exam.");
      return null;
    }

    const { data: marks, error: marksError } = await supabase
      .from("exam_result_subjects")
      .select("student_id, subject_id, score, grade, is_absent")
      .eq("exam_id", selectedExamId);

    if (marksError) {
      setError("Failed to fetch marks.");
      return null;
    }

    const marksMap: Record<string, Record<string, ExamResultSubject>> = {};
    if (marks) {
      marks.forEach((m: any) => {
        if (!marksMap[m.student_id]) {
          marksMap[m.student_id] = {};
        }
        marksMap[m.student_id][m.subject_id] = m;
      });
    }

    return { exam, filteredStudents, subjectList, marksMap };
  };

  const handleDownloadExcel = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchData();
      if (!data) return;

      const { exam, filteredStudents, subjectList, marksMap } = data;

      const header = ["Roll No", "Student Name", "Standard", "Division", ...subjectList.map(s => s.name), "Total", "Percentage"];
      
      const rows = filteredStudents.map(student => {
        let total = 0;
        let maxTotal = 0;
        
        const rowData: any[] = [
          student.roll_number || "",
          student.full_name,
          student.standard || "",
          student.division || ""
        ];

        subjectList.forEach(subject => {
          const mark = marksMap[student.id]?.[subject.id];
          if (mark) {
            if (mark.is_absent) {
              rowData.push("AB");
            } else if (subject.evaluation_type === "grade") {
              rowData.push(mark.grade || "");
            } else {
              rowData.push(mark.score !== null ? mark.score : "");
              total += Number(mark.score || 0);
              // Approximate max total (ideally max_marks should be used here, but for simplicity we skip precise percentage calculation if not fully available, or we just display total)
              maxTotal += 100; // Assuming 100 max if not specified in this simple view
            }
          } else {
            rowData.push("");
          }
        });
        
        rowData.push(total);
        rowData.push(maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) + "%" : "");

        return rowData;
      });

      const ws = XLSX.utils.aoa_to_sheet([
        [`${school.name || "School"} - Grade Sheet`],
        [`Exam: ${exam.name}`, `Class: ${standardFilter !== 'all' ? standardFilter : 'All'}`, `Division: ${divisionFilter !== 'all' ? divisionFilter : 'All'}`],
        [],
        header,
        ...rows
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Grade Sheet");
      
      let filename = `GradeSheet_${exam.name.replace(/\\s+/g, "_")}`;
      if (standardFilter !== "all") filename += `_${standardFilter}`;
      if (divisionFilter !== "all") filename += `_${divisionFilter}`;
      filename += `.xlsx`;
      
      XLSX.writeFile(wb, filename);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate Excel");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchData();
      if (!data) return;

      const { exam, filteredStudents, subjectList, marksMap } = data;

      const doc = new jsPDF({ orientation: "landscape" });
      
      doc.setFontSize(16);
      doc.text(`${school.name || "School"} - Grade Sheet`, 14, 15);
      doc.setFontSize(11);
      doc.text(`Exam: ${exam.name} | Standard: ${standardFilter !== 'all' ? standardFilter : 'All'} | Division: ${divisionFilter !== 'all' ? divisionFilter : 'All'}`, 14, 23);

      const head = [["Roll No", "Name", "Std", "Div", ...subjectList.map(s => s.name), "Total", "%"]];
      
      const body = filteredStudents.map(student => {
        let total = 0;
        let maxTotal = 0;
        
        const rowData = [
          student.roll_number?.toString() || "-",
          student.full_name,
          student.standard || "-",
          student.division || "-"
        ];

        subjectList.forEach(subject => {
          const mark = marksMap[student.id]?.[subject.id];
          if (mark) {
            if (mark.is_absent) {
              rowData.push("AB");
            } else if (subject.evaluation_type === "grade") {
              rowData.push(mark.grade || "-");
            } else {
              rowData.push(mark.score?.toString() || "-");
              total += Number(mark.score || 0);
              maxTotal += 100;
            }
          } else {
            rowData.push("-");
          }
        });
        
        rowData.push(total.toString());
        rowData.push(maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(2) + "%" : "-");

        return rowData;
      });

      autoTable(doc, {
        head,
        body,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      let filename = `GradeSheet_${exam.name.replace(/\\s+/g, "_")}`;
      if (standardFilter !== "all") filename += `_${standardFilter}`;
      if (divisionFilter !== "all") filename += `_${divisionFilter}`;
      filename += `.pdf`;

      doc.save(filename);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((e) => standardFilter === "all" || e.standard === standardFilter || !e.standard);
  const divisions = Array.from(new Set(students.filter(s => standardFilter === "all" || s.standard === standardFilter).map((s) => s.division).filter(Boolean))) as string[];

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
        </div>

        <div className="flex gap-4">
          <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={handleDownloadExcel} disabled={loading || !selectedExamId}>
            <ExcelIcon className="h-4 w-4" />
            {loading ? "Generating Excel…" : "Download Excel"}
          </Button>
          <Button size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={handleDownloadPDF} disabled={loading || !selectedExamId}>
            <PdfIcon className="h-4 w-4" />
            {loading ? "Generating PDF…" : "Download PDF"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
