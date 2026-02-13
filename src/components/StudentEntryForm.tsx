"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function StudentEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    date_of_birth: "",
    grade: "",
    section: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError("Full name is required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("students").insert({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        date_of_birth: form.date_of_birth || null,
        grade: form.grade.trim() || null,
        section: form.section.trim() || null,
      });

      if (err) {
        setError(err.message);
        return;
      }

      setForm({ full_name: "", email: "", date_of_birth: "", grade: "", section: "" });
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
        <Label htmlFor="full_name">Full name *</Label>
        <Input
          id="full_name"
          type="text"
          value={form.full_name}
          onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
          placeholder="e.g. John Doe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="student@example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grade">Grade</Label>
          <Input
            id="grade"
            type="text"
            value={form.grade}
            onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
            placeholder="e.g. 10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="section">Section</Label>
        <Input
          id="section"
          type="text"
          value={form.section}
          onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
          placeholder="e.g. A"
        />
      </div>
      <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">
        Add student
      </SubmitButton>
    </form>
  );
}
