"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { fetchStandards } from "@/lib/lov";
import type { StandardOption } from "@/lib/lov";
import { updateExam } from "@/app/dashboard/exams/actions";
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
    }
  }, [open, exam.name, exam.standard, exam.term, standardsList]);

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
    const standardName = standardsList.find((s) => s.id === form.standardId)?.name ?? null;
    setSaving(true);
    try {
      const result = await updateExam(exam.id, {
        name: form.name.trim(),
        standard: standardName,
        term: form.term,
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
      <DialogContent className="sm:max-w-md">
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
            <Label>Standard *</Label>
            <Select
              value={form.standardId || "_none"}
              onValueChange={(v) => setForm((p) => ({ ...p, standardId: v === "_none" ? "" : v }))}
            >
              <SelectTrigger>
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
            <Label>Term *</Label>
            <Select
              value={form.term}
              onValueChange={(v) => setForm((p) => ({ ...p, term: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term-1">Term-1</SelectItem>
                <SelectItem value="Term-2">Term-2</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
