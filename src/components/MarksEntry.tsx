"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, AlertCircle } from "lucide-react";

type Exam = {
  id: string;
  name: string;
  exam_type: string;
  grade: string | null;
  held_at: string;
  academic_years: { id: string; name: string } | null;
};
type Student = { id: string; full_name: string; grade: string | null; division: string | null };
type Subject = { id: string; name: string; code: string | null; evaluation_type: string };
type CellState = { score: string; max_score: string; grade: string; is_absent: boolean };

export default function MarksEntry() {
  const router = useRouter();
  const supabase = createClient();

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [marks, setMarks] = useState<Record<string, Record<string, CellState>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [examSubjectMaxMarks, setExamSubjectMaxMarks] = useState<Record<string, number>>({});

  const exam = exams.find((e) => e.id === selectedExamId);
  const effectiveGrade =
    gradeFilter && gradeFilter !== "all"
      ? gradeFilter
      : exam?.grade
        ? exam.grade
        : null;

  // Load exams (with academic year) and class names
  useEffect(() => {
    supabase
      .from("exams")
      .select("id, name, exam_type, grade, held_at, academic_years(id, name)")
      .order("held_at", { ascending: false })
      .then(({ data }) => setExams((data ?? []) as Exam[]));
    supabase
      .from("classes")
      .select("name")
      .order("sort_order")
      .then(({ data }) => setClassNames((data ?? []).map((c: { name: string }) => c.name)));
  }, []);

  // When exam changes, reset filters to exam's standard
  useEffect(() => {
    if (exam?.grade) {
      setGradeFilter(exam.grade);
      setDivisionFilter("all");
    } else {
      setGradeFilter("all");
      setDivisionFilter("all");
    }
  }, [selectedExamId, exam?.grade]);

  // Load subjects for effective grade
  useEffect(() => {
    if (!effectiveGrade) {
      setSubjects([]);
      return;
    }
    supabase
      .from("classes")
      .select("id")
      .eq("name", effectiveGrade)
      .maybeSingle()
      .then(({ data: classRow }) => {
        if (!classRow?.id) {
          setSubjects([]);
          return;
        }
        supabase
          .from("subjects")
          .select("id, name, code, evaluation_type")
          .eq("class_id", classRow.id)
          .order("sort_order")
          .then(({ data }) => setSubjects((data ?? []) as Subject[]));
      });
  }, [effectiveGrade]);

  // Load max marks per subject for selected exam
  useEffect(() => {
    if (!selectedExamId || subjects.length === 0) {
      setExamSubjectMaxMarks({});
      return;
    }
    supabase
      .from("exam_subjects")
      .select("subject_id, max_marks")
      .eq("exam_id", selectedExamId)
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data ?? []).forEach((r: { subject_id: string; max_marks: number }) => {
          map[r.subject_id] = Number(r.max_marks);
        });
        setExamSubjectMaxMarks(map);
      });
  }, [selectedExamId, subjects]);

  const loadStudentsAndMarks = useCallback(() => {
    if (!selectedExamId || subjects.length === 0) return;
    setLoading(true);
    setError(null);
    (async () => {
      let query = supabase
        .from("students")
        .select("id, full_name, grade, division")
        .eq("status", "active")
        .order("full_name");
      if (gradeFilter && gradeFilter !== "all") query = query.eq("grade", gradeFilter);
      if (divisionFilter && divisionFilter !== "all") query = query.eq("division", divisionFilter);
      if (exam?.grade && gradeFilter === "all") query = query.eq("grade", exam.grade);

      const { data: st } = await query;
      const studentList = (st ?? []) as Student[];
      setStudents(studentList);

      const initial: Record<string, Record<string, CellState>> = {};
      studentList.forEach((s) => {
        initial[s.id] = {};
        subjects.forEach((sub) => {
          initial[s.id][sub.id] = { score: "", max_score: "", grade: "", is_absent: false };
        });
      });

      const { data: rows } = await supabase
        .from("exam_result_subjects")
        .select("student_id, subject_id, score, max_score, grade, is_absent")
        .eq("exam_id", selectedExamId);
      if (rows?.length) {
        rows.forEach(
          (r: {
            student_id: string;
            subject_id: string;
            score: number | null;
            max_score: number | null;
            grade: string | null;
            is_absent: boolean;
          }) => {
            if (initial[r.student_id]?.[r.subject_id]) {
              initial[r.student_id][r.subject_id] = {
                score: r.score != null ? String(r.score) : "",
                max_score: r.max_score != null ? String(r.max_score) : "",
                grade: r.grade ?? "",
                is_absent: r.is_absent ?? false,
              };
            }
          }
        );
      }
      setMarks(initial);
    })().finally(() => setLoading(false));
  }, [selectedExamId, exam?.grade, gradeFilter, divisionFilter, subjects]);

  useEffect(() => {
    if (!selectedExamId || subjects.length === 0) {
      setStudents([]);
      setMarks({});
      return;
    }
    loadStudentsAndMarks();
  }, [selectedExamId, subjects.length, gradeFilter, divisionFilter, loadStudentsAndMarks]);

  const setCell = (studentId: string, subjectId: string, patch: Partial<CellState>) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      next[studentId] = {
        ...next[studentId],
        [subjectId]: { ...(next[studentId][subjectId] ?? { score: "", max_score: "", grade: "", is_absent: false }), ...patch },
      };
      return next;
    });
  };

  const toggleAbsent = (studentId: string, subjectId: string) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      const cur = next[studentId][subjectId] ?? { score: "", max_score: "", grade: "", is_absent: false };
      next[studentId] = { ...next[studentId], [subjectId]: { ...cur, is_absent: !cur.is_absent } };
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string, subjectId: string) => {
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      toggleAbsent(studentId, subjectId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      setError("Select an exam first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const rows: {
        exam_id: string;
        student_id: string;
        subject_id: string;
        score: number | null;
        max_score: number | null;
        grade: string | null;
        is_absent: boolean;
      }[] = [];
      for (const [studentId, subMap] of Object.entries(marks)) {
        for (const [subjectId, cell] of Object.entries(subMap)) {
          const sub = subjects.find((s) => s.id === subjectId);
          const isGradeBased = sub?.evaluation_type === "grade";
          rows.push({
            exam_id: selectedExamId,
            student_id: studentId,
            subject_id: subjectId,
            score: cell.is_absent ? null : (isGradeBased ? null : (cell.score.trim() ? parseFloat(cell.score) : null)),
            max_score: cell.is_absent ? null : (isGradeBased ? null : (cell.max_score.trim() ? parseFloat(cell.max_score) : null)),
            grade: cell.is_absent ? null : (isGradeBased ? (cell.grade.trim() || null) : null),
            is_absent: cell.is_absent,
          });
        }
      }
      for (const row of rows) {
        await supabase.from("exam_result_subjects").upsert(
          { ...row, updated_at: new Date().toISOString() },
          { onConflict: "exam_id,student_id,subject_id" }
        );
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const grades = classNames.length > 0 ? classNames : Array.from(new Set(students.map((s) => s.grade).filter(Boolean))) as string[];
  const divisions = Array.from(new Set(students.map((s) => s.division).filter(Boolean))) as string[];
  const academicYearName = exam?.academic_years?.name ?? "";

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {/* Step 1: Choose exam – one clear dropdown with full context */}
          <div className="space-y-2">
            <Label className="text-base font-medium">1. Choose exam</Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-full max-w-xl">
                <SelectValue placeholder="Select exam (name, standard, date, year)" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => {
                  const ayName = (e.academic_years as { name?: string } | null)?.name ?? "";
                  const dateStr = e.held_at ? new Date(e.held_at).toLocaleDateString() : "";
                  const label = [e.name, e.exam_type, e.grade ?? "All", dateStr, ayName].filter(Boolean).join(" · ");
                  return (
                    <SelectItem key={e.id} value={e.id}>
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Sticky context banner so teacher always knows which exam they're in */}
          {exam && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <ClipboardList className="h-5 w-5 text-primary shrink-0" />
              <span className="font-medium text-foreground">Recording marks for:</span>
              <span className="text-foreground">{exam.name}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">Standard: {exam.grade ?? "All"}</span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                Start date: {exam.held_at ? new Date(exam.held_at).toLocaleDateString() : "—"}
              </span>
              {academicYearName && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">{academicYearName}</span>
                </>
              )}
            </div>
          )}

          {/* Step 2: Optional filters – default to exam's standard */}
          {exam && (
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Standard</Label>
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {grades.map((g) => (
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
            </div>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground">Loading students and existing marks…</p>
          )}

          {selectedExamId && subjects.length > 0 && students.length > 0 && !loading && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter marks or grades per subject. Right‑click a cell to mark absent (A). Max marks are from exam setup.
              </p>
              <div className="overflow-x-auto border rounded-md" style={{ maxHeight: 440 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-muted/80 min-w-[140px]">Student</TableHead>
                      <TableHead className="sticky left-[140px] z-10 bg-muted/80 min-w-[72px]">Std / Div</TableHead>
                      {subjects.map((sub) => (
                        <TableHead
                          key={sub.id}
                          className="text-center min-w-[88px] whitespace-nowrap bg-muted/50"
                          title={sub.evaluation_type === "grade" ? "Grade (A/B/C)" : `Out of ${examSubjectMaxMarks[sub.id] ?? "?"}`}
                        >
                          {sub.code ?? sub.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium">
                          {s.full_name}
                        </TableCell>
                        <TableCell className="sticky left-[140px] z-10 bg-background text-muted-foreground text-sm">
                          {s.grade ?? "—"} / {s.division ?? "—"}
                        </TableCell>
                        {subjects.map((sub) => {
                          const cell = marks[s.id]?.[sub.id] ?? { score: "", max_score: "", grade: "", is_absent: false };
                          const isGradeBased = sub.evaluation_type === "grade";
                          const maxMarks = examSubjectMaxMarks[sub.id] ?? 100;
                          return (
                            <TableCell key={sub.id} className="p-1">
                              <div
                                className="flex items-center gap-0.5"
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  toggleAbsent(s.id, sub.id);
                                }}
                              >
                                {cell.is_absent ? (
                                  <span className="text-destructive font-medium text-sm" title="Absent (right-click to toggle)">A</span>
                                ) : isGradeBased ? (
                                  <Input
                                    type="text"
                                    className="w-12 h-8 text-center text-sm"
                                    value={cell.grade}
                                    onChange={(e) => setCell(s.id, sub.id, { grade: e.target.value })}
                                    onKeyDown={(ev) => handleKeyDown(ev, s.id, sub.id)}
                                    placeholder="A/B/C"
                                  />
                                ) : (
                                  <>
                                    <Input
                                      type="number"
                                      step={0.01}
                                      min={0}
                                      max={maxMarks}
                                      className="w-14 h-8 text-center text-sm"
                                      value={cell.score}
                                      onChange={(e) => setCell(s.id, sub.id, { score: e.target.value })}
                                      onKeyDown={(ev) => handleKeyDown(ev, s.id, sub.id)}
                                      placeholder="—"
                                    />
                                    <span className="text-muted-foreground text-xs">/ {maxMarks}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <SubmitButton loading={saving} loadingLabel="Saving…">
                Save marks
              </SubmitButton>
            </>
          )}

          {selectedExamId && students.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              No students match this standard/division. Adjust filters or add students.
            </p>
          )}

          {selectedExamId && subjects.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              {effectiveGrade
                ? "No subjects for this standard. Add subjects in Standard management → Subject management."
                : "Select a standard to load subjects."}
            </p>
          )}

          {!selectedExamId && (
            <p className="text-sm text-muted-foreground">Select an exam above to load students and enter marks.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
