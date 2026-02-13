"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/Button";

const ROLES = ["teacher", "staff", "admin", "other"] as const;

export default function EmployeeEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "staff",
    department: "",
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
      const { error: err } = await supabase.from("employees").insert({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        role: form.role,
        department: form.department.trim() || null,
      });

      if (err) {
        setError(err.message);
        return;
      }

      setForm({ full_name: "", email: "", role: "staff", department: "" });
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
          placeholder="e.g. Jane Smith"
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
          placeholder="employee@example.com"
        />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
          Role
        </label>
        <select
          id="role"
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="department" className="block text-sm font-medium text-foreground mb-1">
          Department
        </label>
        <input
          id="department"
          type="text"
          value={form.department}
          onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Mathematics"
        />
      </div>
      <SubmitButton loading={loading} loadingLabel="Adding…">
        Add employee
      </SubmitButton>
    </form>
  );
}
