"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { fetchStandards } from "@/lib/lov";
import type { StandardOption } from "@/lib/lov";
import { updateExam } from "@/app/(workspace)/dashboard/exams/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ExamRow = { id: string; name: string; standard: string | null; term: string | null };

export function ExamEditDialog({ exam }: { exam: ExamRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [standardsList, setStandardsList] = useState<StandardOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: exam.name,
    standardId: "",
    term: exam.term ?? "Term-1",
  });
  const [subjects, setSubjects] = useState<{ id: string; name: string; code: string | null; evaluation_type: string }[]>([]);
  const [maxMarks, setMaxMarks] = useState<Record<string, string>>({});
  const [passingMarks, setPassingMarks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchStandards().then(setStandardsList);
  }, []);

  useEffect(() => {
    if (open) {
      setForm({
        name: exam.name,
        standardId: standardsList.find((s) => s.name === exam.standard)?.id ?? "",
        term: exam.term ?? "Term-1",
      });
      setError(null);
      
      const supabase = createClient();
      supabase
        .from("exam_subjects")
        .select("max_marks, passing_marks, subjects(id, name, code, evaluation_type, sort_order)")
        .eq("exam_id", exam.id)
        .then(({ data }) => {
          if (data) {
            // @ts-ignore
            const rows = data.map(d => d.subjects).sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0));
            setSubjects(rows as any);
            const maxM: Record<string, string> = {};
            const passM: Record<string, string> = {};
            data.forEach(d => {
              // @ts-ignore
              if (d.subjects.evaluation_type === 'mark') {
                // @ts-ignore
                maxM[d.subjects.id] = d.max_marks?.toString() || "";
                // @ts-ignore
                passM[d.subjects.id] = d.passing_marks?.toString() || "";
              }
            });
            setMaxMarks(maxM);
            setPassingMarks(passM);
          }
        });
    } else {
      setSubjects([]);
      setMaxMarks({});
      setPassingMarks({});
    }
  }, [open, exam.id, exam.name, exam.standard, exam.term, standardsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Exam name is required.");
      return;
    }
    if (!form.standardId) {
      setError("Standard is required.");
      return;
    }
    if (!form.term) {
      setError("Term is required.");
      return;
    }
    const markBasedSubjects = subjects.filter((s) => s.evaluation_type === "mark");
    for (const sub of markBasedSubjects) {
      const val = maxMarks[sub.id]?.trim();
      const num = val ? parseFloat(val) : NaN;
      if (!val || isNaN(num) || num <= 0) {
        setError(`Max marks is required for ${sub.code ?? sub.name} (marks-based subject).`);
        return;
      }
    }

    const standardName = standardsList.find((s) => s.id === form.standardId)?.name ?? null;
    const subjectMaxMarks: { subjectId: string; maxMarks: number; passingMarks: number | null }[] = [];
    for (const sub of subjects) {
      if (sub.evaluation_type === "mark") {
        const val = parseFloat(maxMarks[sub.id] ?? "0");
        const passVal = passingMarks[sub.id]?.trim();
        const passNum = passVal ? parseFloat(passVal) : null;
        if (!isNaN(val) && val > 0) {
          subjectMaxMarks.push({ subjectId: sub.id, maxMarks: val, passingMarks: passNum });
        }
      } else {
        subjectMaxMarks.push({ subjectId: sub.id, maxMarks: 100, passingMarks: null });
      }
    }

    setSaving(true);
    try {
      const result = await updateExam(exam.id, {
        name: form.name.trim(),
        standard: standardName,
        term: form.term,
        subjectMaxMarks,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit exam</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
          )}
          <div className="space-y-2">
            <Label>Exam name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Final Exam"
            />
          </div>
          <div className="space-y-2">
            <Label>Standard</Label>
            <Select disabled value={form.standardId || "_none"} onValueChange={() => {}}>
              <SelectTrigger className="opacity-50">
                <SelectValue placeholder="Select standard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select standard</SelectItem>
                {standardsList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select disabled value={form.term} onValueChange={() => {}}>
              <SelectTrigger className="opacity-50">
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term-1">Term-1</SelectItem>
                <SelectItem value="Term-2">Term-2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {subjects.length > 0 && (
            <div className="space-y-2">
              <Label>Subjects &amp; marks</Label>
              <div className="rounded-md border border-border divide-y divide-border">
                {subjects.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-4 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">
                      {sub.code ?? sub.name}
                      {sub.evaluation_type === "grade" && (
                        <span className="text-muted-foreground font-normal ml-1">(grade)</span>
                      )}
                    </span>
                    {sub.evaluation_type === "mark" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Label htmlFor={`edit-max-${sub.id}`} className="text-muted-foreground text-xs">
                          Max *
                        </Label>
                        <Input
                          id={`edit-max-${sub.id}`}
                          type="number"
                          min={1}
                          className="w-20 h-8"
                          value={maxMarks[sub.id] ?? ""}
                          onChange={(e) =>
                            setMaxMarks((p) => ({ ...p, [sub.id]: e.target.value }))
                          }
                          placeholder="Max"
                        />
                        <Label htmlFor={`edit-pass-${sub.id}`} className="text-muted-foreground text-xs ml-2">
                          Pass
                        </Label>
                        <Input
                          id={`edit-pass-${sub.id}`}
                          type="number"
                          min={1}
                          className="w-20 h-8"
                          value={passingMarks[sub.id] ?? ""}
                          onChange={(e) =>
                            setPassingMarks((p) => ({ ...p, [sub.id]: e.target.value }))
                          }
                          placeholder="Opt."
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
