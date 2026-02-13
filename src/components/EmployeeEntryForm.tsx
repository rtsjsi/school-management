"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name *</Label>
        <Input
          id="full_name"
          type="text"
          value={form.full_name}
          onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
          placeholder="e.g. Jane Smith"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="employee@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          type="text"
          value={form.department}
          onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
          placeholder="e.g. Mathematics"
        />
      </div>
      <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">
        Add employee
      </SubmitButton>
    </form>
  );
}
