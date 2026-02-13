"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/dashboard/users/actions";
import { ROLES } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CreateUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "teacher" as UserRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    setLoading(true);
    try {
      const result = await createUser(
        form.email,
        form.password,
        form.full_name,
        form.role
      );

      if (result.ok) {
        setSuccess(true);
        setForm({ email: "", password: "", full_name: "", role: "teacher" });
        router.refresh();
      } else {
        setError(result.error);
      }
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
      {success && (
        <p className="text-sm text-primary bg-primary/10 p-2 rounded-md">
          User created successfully.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="user@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password * (min 6 characters)</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          placeholder="••••••••"
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          type="text"
          value={form.full_name}
          onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
          placeholder="Jane Doe"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <select
          id="role"
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {(Object.keys(ROLES) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r]}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton loading={loading} loadingLabel="Creating…" className="w-full">
        Create user
      </SubmitButton>
    </form>
  );
}
