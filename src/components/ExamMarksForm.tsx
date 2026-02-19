"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Exam = { id: string; name: string; exam_type: string; grade: string | null; held_at: string };
type Student = { id: string; full_name: string; grade: string };
type ExamResult = { student_id: string; score: number | null; max_score: number | null };

export default function ExamMarksForm() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [marks, setMarks] = useState<Record<string, { score: string; max_score: string }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("exams").select("id, name, exam_type, grade, held_at").order("held_at", { ascending: false }).then(({ data }) => setExams(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setStudents([]);
      setMarks({});
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const exam = exams.find((e) => e.id === selectedExamId);
    (async () => {
      let query = supabase.from("students").select("id, full_name, grade").eq("status", "active").order("full_name");
      if (exam?.grade && exam.grade !== "All") {
        query = query.eq("grade", exam.grade);
      }
      const { data: st } = await query;
      setStudents(st ?? []);
      const initial: Record<string, { score: string; max_score: string }> = {};
      (st ?? []).forEach((s) => { initial[s.id] = { score: "", max_score: "" }; });
      setMarks(initial);
      const { data: results } = await supabase.from("exam_results").select("student_id, score, max_score").eq("exam_id", selectedExamId);
      if (results && results.length > 0) {
        setMarks((prev) => {
          const next = { ...prev };
          results.forEach((r) => {
            next[r.student_id] = {
              score: r.score != null ? String(r.score) : "",
              max_score: r.max_score != null ? String(r.max_score) : "",
            };
          });
          return next;
        });
      }
    })().finally(() => setLoading(false));
  }, [selectedExamId, exams]);

  const handleMarkChange = (studentId: string, field: "score" | "max_score", value: string) => {
    setMarks((p) => ({
      ...p,
      [studentId]: { ...p[studentId], [field]: value },
    }));
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
      const supabase = createClient();
      const upserts: ExamResult[] = [];
      for (const [studentId, m] of Object.entries(marks)) {
        const score = m.score.trim() ? parseFloat(m.score) : null;
        const maxScore = m.max_score.trim() ? parseFloat(m.max_score) : null;
        if (score != null || maxScore != null) {
          upserts.push({ student_id: studentId, score, max_score: maxScore });
        }
      }
      for (const u of upserts) {
        await supabase.from("exam_results").upsert(
          {
            exam_id: selectedExamId,
            student_id: u.student_id,
            score: u.score,
            max_score: u.max_score,
          },
          { onConflict: "exam_id,student_id" }
        );
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="space-y-2">
            <Label>Select Exam</Label>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.exam_type}) - {e.held_at ? new Date(e.held_at).toLocaleDateString() : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && <p className="text-sm text-muted-foreground">Loading students…</p>}

          {selectedExamId && students.length > 0 && !loading && (
            <div className="flex flex-col min-w-0" style={{ maxHeight: 400 }}>
              <div className="flex-1 min-h-0 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Max Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">{s.full_name}</TableCell>
                        <TableCell>{s.grade ?? "—"}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step={0.01}
                            min={0}
                            className="w-24"
                            value={marks[s.id]?.score ?? ""}
                            onChange={(e) => handleMarkChange(s.id, "score", e.target.value)}
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step={0.01}
                            min={0}
                            className="w-24"
                            value={marks[s.id]?.max_score ?? ""}
                            onChange={(e) => handleMarkChange(s.id, "max_score", e.target.value)}
                            placeholder="100"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {selectedExamId && students.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No students match this exam&apos;s grade filter.</p>
          )}

          {selectedExamId && students.length > 0 && (
            <SubmitButton loading={saving} loadingLabel="Saving…">
              Save Marks
            </SubmitButton>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
