"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createExamWithSubjects } from "@/app/dashboard/exams/actions";
import { fetchClasses, fetchAcademicYears } from "@/lib/lov";
import type { ClassOption } from "@/lib/lov";
import type { AcademicYearOption } from "@/lib/lov";
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

const EXAM_TYPES = ["midterm", "final", "quiz", "assignment"] as const;

type SubjectRow = { id: string; name: string; code: string | null; evaluation_type: string };

export default function ExamEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standards, setStandards] = useState<ClassOption[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [form, setForm] = useState({
    name: "",
    exam_type: "final" as string,
    standardId: "",
    academicYearId: "",
    held_at: "",
    description: "",
  });
  const [maxMarks, setMaxMarks] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchClasses().then(setStandards);
    fetchAcademicYears().then((list) => {
      setAcademicYears(list);
      const active = list.find((y) => y.is_active) ?? list[0];
      if (active) {
        setForm((p) => (p.academicYearId ? p : { ...p, academicYearId: active.id }));
      }
    });
  }, []);

  useEffect(() => {
    if (!form.standardId) {
      setSubjects([]);
      setMaxMarks({});
      return;
    }
    const supabase = createClient();
    supabase
      .from("subjects")
      .select("id, name, code, evaluation_type")
      .eq("class_id", form.standardId)
      .order("sort_order")
      .then(({ data }) => {
        const rows = (data ?? []) as SubjectRow[];
        setSubjects(rows);
        const next: Record<string, string> = {};
        rows.forEach((s) => {
          if (s.evaluation_type === "mark") next[s.id] = "100";
        });
        setMaxMarks(next);
      });
  }, [form.standardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Exam name is required.");
      return;
    }
    if (!form.held_at) {
      setError("Start date is required.");
      return;
    }
    if (!form.standardId) {
      setError("Standard is required.");
      return;
    }
    if (!form.academicYearId) {
      setError("Academic year is required.");
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

    const standardName = standards.find((s) => s.id === form.standardId)?.name ?? null;
    const subjectMaxMarks: { subjectId: string; maxMarks: number }[] = [];
    for (const sub of subjects) {
      const val =
        sub.evaluation_type === "mark"
          ? parseFloat(maxMarks[sub.id] ?? "0")
          : 100;
      if (!isNaN(val) && val > 0) subjectMaxMarks.push({ subjectId: sub.id, maxMarks: val });
    }

    setLoading(true);
    try {
      const result = await createExamWithSubjects({
        name: form.name.trim(),
        exam_type: form.exam_type,
        held_at: form.held_at,
        description: form.description.trim() || null,
        grade: standardName,
        academic_year_id: form.academicYearId,
        subjectMaxMarks,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setForm({
        name: "",
        exam_type: "final",
        standardId: "",
        academicYearId: "",
        held_at: "",
        description: "",
      });
      setSubjects([]);
      setMaxMarks({});
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="exam-name">Exam name *</Label>
        <Input
          id="exam-name"
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Math Midterm"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exam-ay">Academic year *</Label>
          <Select
            value={form.academicYearId || "_none"}
            onValueChange={(v) => setForm((p) => ({ ...p, academicYearId: v === "_none" ? "" : v }))}
          >
            <SelectTrigger id="exam-ay" className="w-full">
              <SelectValue placeholder="Select academic year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Select academic year</SelectItem>
              {academicYears.map((ay) => (
                <SelectItem key={ay.id} value={ay.id}>
                  {ay.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-held">Start date *</Label>
          <Input
            id="exam-held"
            type="date"
            value={form.held_at}
            onChange={(e) => setForm((p) => ({ ...p, held_at: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exam-standard">Standard *</Label>
          <Select
            value={form.standardId || "_none"}
            onValueChange={(v) => setForm((p) => ({ ...p, standardId: v === "_none" ? "" : v }))}
          >
            <SelectTrigger id="exam-standard" className="w-full">
              <SelectValue placeholder="Select standard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Select standard</SelectItem>
              {standards.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-type">Type</Label>
          <Select
            value={form.exam_type}
            onValueChange={(v) => setForm((p) => ({ ...p, exam_type: v }))}
          >
            <SelectTrigger id="exam-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXAM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {subjects.length > 0 && (
        <div className="space-y-2">
          <Label>Subjects &amp; max marks</Label>
          <p className="text-xs text-muted-foreground">
            Max marks is required for marks-based subjects. Grade-based subjects are excluded.
          </p>
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
                    <Label htmlFor={`max-${sub.id}`} className="text-muted-foreground text-xs">
                      Max marks *
                    </Label>
                    <Input
                      id={`max-${sub.id}`}
                      type="number"
                      min={1}
                      className="w-20 h-8"
                      value={maxMarks[sub.id] ?? ""}
                      onChange={(e) =>
                        setMaxMarks((p) => ({ ...p, [sub.id]: e.target.value }))
                      }
                      placeholder="e.g. 100"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="exam-desc">Description</Label>
        <Input
          id="exam-desc"
          type="text"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <div className="flex justify-start">
      <SubmitButton loading={loading} loadingLabel="Adding…">
        Add exam
      </SubmitButton>
    </div>
    </form>
  );
}
