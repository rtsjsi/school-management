"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setExamSubjectMaxMarks } from "@/app/dashboard/exams/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

type Exam = { id: string; name: string; grade: string | null };
type Subject = { id: string; name: string; code: string | null; evaluation_type: string };

export function ExamSubjectsConfig({ exam }: { exam: Exam }) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [maxMarks, setMaxMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!open || !exam.grade || exam.grade === "All") return;
    setLoading(true);
    (async () => {
      const { data: classRow } = await supabase.from("classes").select("id").eq("name", exam.grade).maybeSingle();
      if (!classRow?.id) {
        setSubjects([]);
        setLoading(false);
        return;
      }
      const { data: subData } = await supabase
        .from("subjects")
        .select("id, name, code, evaluation_type")
        .eq("class_id", classRow.id)
        .order("sort_order");
      setSubjects((subData ?? []) as Subject[]);

      const { data: examSubs } = await supabase
        .from("exam_subjects")
        .select("subject_id, max_marks")
        .eq("exam_id", exam.id);
      const map: Record<string, string> = {};
      (examSubs ?? []).forEach((r: { subject_id: string; max_marks: number }) => {
        map[r.subject_id] = String(r.max_marks);
      });
      (subData ?? []).forEach((s: { id: string }) => {
        if (!(s.id in map)) map[s.id] = "100";
      });
      setMaxMarks(map);
    })().finally(() => setLoading(false));
  }, [open, exam.id, exam.grade]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const sub of subjects) {
        if (sub.evaluation_type === "mark") {
          const val = parseFloat(maxMarks[sub.id] ?? "100");
          if (!isNaN(val) && val > 0) {
            await setExamSubjectMaxMarks(exam.id, sub.id, val);
          }
        }
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const markBasedSubjects = subjects.filter((s) => s.evaluation_type === "mark");
  if (markBasedSubjects.length === 0 && subjects.length > 0) return null;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1">
        <Settings2 className="h-3 w-3" />
        Set max marks
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <Card className="w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Max marks per subject</CardTitle>
                <CardDescription>
                  {exam.name} – set max marks for each subject. Grade-based subjects are skipped.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                ×
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : !exam.grade || exam.grade === "All" ? (
                <p className="text-sm text-muted-foreground">Select a specific grade for the exam to set max marks.</p>
              ) : markBasedSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mark-based subjects for this class.</p>
              ) : (
                <>
                  {markBasedSubjects.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-4">
                      <Label className="w-32">{sub.code ?? sub.name}</Label>
                      <Input
                        type="number"
                        min={1}
                        className="w-24"
                        value={maxMarks[sub.id] ?? "100"}
                        onChange={(e) => setMaxMarks((p) => ({ ...p, [sub.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
