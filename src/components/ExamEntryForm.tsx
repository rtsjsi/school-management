"use client";

import { useState } from "react";
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

const EXAM_TYPES = ["midterm", "final", "quiz", "assignment"] as const;

export default function ExamEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    exam_type: "final" as string,
    subject: "",
    grade: "",
    held_at: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Exam name is required.");
      return;
    }
    if (!form.held_at) {
      setError("Date is required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("exams").insert({
        name: form.name.trim(),
        exam_type: form.exam_type,
        subject: form.subject.trim() || null,
        grade: form.grade.trim() || null,
        held_at: form.held_at,
        description: form.description.trim() || null,
      });

      if (err) {
        setError(err.message);
        return;
      }

      setForm({
        name: "",
        exam_type: "final",
        subject: "",
        grade: "",
        held_at: "",
        description: "",
      });
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
      <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="exam-held">Date *</Label>
          <Input
            id="exam-held"
            type="date"
            value={form.held_at}
            onChange={(e) => setForm((p) => ({ ...p, held_at: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="exam-subject">Subject</Label>
          <Input
            id="exam-subject"
            type="text"
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder="e.g. Mathematics"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-grade">Grade</Label>
          <Input
            id="exam-grade"
            type="text"
            value={form.grade}
            onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
            placeholder="e.g. 10"
          />
        </div>
      </div>
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
      <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">
        Add exam
      </SubmitButton>
    </form>
  );
}
