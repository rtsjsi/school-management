"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Exam = { id: string; name: string; exam_type: string; grade: string | null; held_at: string };
type Student = { id: string; full_name: string; grade: string | null; section: string | null };
type Subject = { id: string; name: string; code: string | null };
type CellState = { score: string; max_score: string; is_absent: boolean };

export default function MultipleSubjectwiseMarksEntry() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [marks, setMarks] = useState<Record<string, Record<string, CellState>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      .select("id, name, code")
      .order("sort_order")
      .then(({ data }) => setSubjects(data ?? []));
  }, []);

  const loadStudentsAndMarks = useCallback(() => {
    if (!selectedExamId) return;
    setLoading(true);
    setError(null);
    const exam = exams.find((e) => e.id === selectedExamId);
    (async () => {
      let query = supabase
        .from("students")
        .select("id, full_name, grade, section")
        .eq("status", "active")
        .order("full_name");
      if (gradeFilter && gradeFilter !== "all") query = query.eq("grade", gradeFilter);
      if (sectionFilter && sectionFilter !== "all") query = query.eq("section", sectionFilter);
      if (exam?.grade && exam.grade !== "All" && (!gradeFilter || gradeFilter === "all")) query = query.eq("grade", exam.grade);
      const { data: st } = await query;
      const studentList = (st ?? []) as Student[];
      setStudents(studentList);

      const initial: Record<string, Record<string, CellState>> = {};
      studentList.forEach((s) => {
        initial[s.id] = {};
        subjects.forEach((sub) => {
          initial[s.id][sub.id] = { score: "", max_score: "", is_absent: false };
        });
      });

      const { data: rows } = await supabase
        .from("exam_result_subjects")
        .select("student_id, subject_id, score, max_score, is_absent")
        .eq("exam_id", selectedExamId);
      if (rows?.length) {
        rows.forEach((r: { student_id: string; subject_id: string; score: number | null; max_score: number | null; is_absent: boolean }) => {
          if (initial[r.student_id] && initial[r.student_id][r.subject_id]) {
            initial[r.student_id][r.subject_id] = {
              score: r.score != null ? String(r.score) : "",
              max_score: r.max_score != null ? String(r.max_score) : "",
              is_absent: r.is_absent ?? false,
            };
          }
        });
      }
      setMarks(initial);
    })().finally(() => setLoading(false));
  }, [selectedExamId, exams, gradeFilter, sectionFilter, subjects]);

  useEffect(() => {
    if (!selectedExamId || subjects.length === 0) {
      setStudents([]);
      setMarks({});
      return;
    }
    loadStudentsAndMarks();
  }, [selectedExamId, subjects, loadStudentsAndMarks]);

  const setCell = (studentId: string, subjectId: string, patch: Partial<CellState>) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      next[studentId] = { ...next[studentId], [subjectId]: { ...next[studentId][subjectId], ...patch } };
      return next;
    });
  };

  const toggleAbsent = (studentId: string, subjectId: string) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      const cur = next[studentId][subjectId] ?? { score: "", max_score: "", is_absent: false };
      next[studentId] = { ...next[studentId], [subjectId]: { ...cur, is_absent: !cur.is_absent } };
      return next;
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    studentId: string,
    subjectId: string
  ) => {
    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      toggleAbsent(studentId, subjectId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) {
      setError("Select an exam.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const rows: { exam_id: string; student_id: string; subject_id: string; score: number | null; max_score: number | null; is_absent: boolean }[] = [];
      for (const [studentId, subMap] of Object.entries(marks)) {
        for (const [subjectId, cell] of Object.entries(subMap)) {
          const score = cell.score.trim() ? parseFloat(cell.score) : null;
          const maxScore = cell.max_score.trim() ? parseFloat(cell.max_score) : null;
          rows.push({
            exam_id: selectedExamId,
            student_id: studentId,
            subject_id: subjectId,
            score: cell.is_absent ? null : score,
            max_score: cell.is_absent ? null : maxScore,
            is_absent: cell.is_absent,
          });
        }
      }
      for (const row of rows) {
        await supabase.from("exam_result_subjects").upsert(
          {
            ...row,
            updated_at: new Date().toISOString(),
          },
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

  const grades = Array.from(new Set(students.map((s) => s.grade).filter(Boolean))) as string[];
  const sections = Array.from(new Set(students.map((s) => s.section).filter(Boolean))) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multiple Subject-wise Marks Entry</CardTitle>
        <CardDescription>
          Enter marks per subject per student. Right-click a cell or press &quot;A&quot; to mark absent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
          )}

          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Choose exam" />
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
              <Label>Grade</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {grades.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={loadStudentsAndMarks}>
              View
            </Button>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading students and marks…</p>}

          {selectedExamId && subjects.length > 0 && students.length > 0 && !loading && (
            <div className="overflow-x-auto border rounded-md" style={{ maxHeight: 420 }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background min-w-[140px]">Student</TableHead>
                    <TableHead className="sticky left-0 z-10 bg-background min-w-[80px]">Gr / Div</TableHead>
                    {subjects.map((sub) => (
                      <TableHead key={sub.id} className="text-center min-w-[90px] whitespace-nowrap">
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
                      <TableCell className="sticky left-[140px] z-10 bg-background text-muted-foreground">
                        {s.grade ?? "—"} / {s.section ?? "—"}
                      </TableCell>
                      {subjects.map((sub) => {
                        const cell = marks[s.id]?.[sub.id] ?? { score: "", max_score: "", is_absent: false };
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
                                <span className="text-destructive font-medium text-sm">A</span>
                              ) : (
                                <>
                                  <Input
                                    type="number"
                                    step={0.01}
                                    min={0}
                                    className="w-14 h-8 text-center text-sm"
                                    value={cell.score}
                                    onChange={(e) => setCell(s.id, sub.id, { score: e.target.value })}
                                    onKeyDown={(ev) => handleKeyDown(ev, s.id, sub.id)}
                                    placeholder="—"
                                  />
                                  <span className="text-muted-foreground text-xs">/</span>
                                  <Input
                                    type="number"
                                    step={0.01}
                                    min={0}
                                    className="w-12 h-8 text-center text-sm"
                                    value={cell.max_score}
                                    onChange={(e) => setCell(s.id, sub.id, { max_score: e.target.value })}
                                    onKeyDown={(ev) => handleKeyDown(ev, s.id, sub.id)}
                                    placeholder="—"
                                  />
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
          )}

          {selectedExamId && students.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No students match the filters. Adjust grade/section or add students.</p>
          )}

          {selectedExamId && subjects.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No subjects found. Add subjects in the database.</p>
          )}

          {selectedExamId && students.length > 0 && subjects.length > 0 && (
            <SubmitButton loading={saving} loadingLabel="Saving…">
              Save Marks
            </SubmitButton>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
