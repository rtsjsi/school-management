"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/Button";

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
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
      )}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
          Full name *
        </label>
        <input
          id="full_name"
          type="text"
          value={form.full_name}
          onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. John Doe"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="student@example.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-foreground mb-1">
            Date of birth
          </label>
          <input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="grade" className="block text-sm font-medium text-foreground mb-1">
            Grade
          </label>
          <input
            id="grade"
            type="text"
            value={form.grade}
            onChange={(e) => setForm((p) => ({ ...p, grade: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 10"
          />
        </div>
      </div>
      <div>
        <label htmlFor="section" className="block text-sm font-medium text-foreground mb-1">
          Section
        </label>
        <input
          id="section"
          type="text"
          value={form.section}
          onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. A"
        />
      </div>
      <SubmitButton loading={loading} loadingLabel="Adding…">
        Add student
      </SubmitButton>
    </form>
  );
}
