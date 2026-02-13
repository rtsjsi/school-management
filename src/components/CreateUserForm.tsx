"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/dashboard/users/actions";
import { ROLES } from "@/types/auth";
import type { UserRole } from "@/types/auth";
import { SubmitButton } from "@/components/ui/Button";

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
        <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
          User created successfully.
        </p>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email *
        </label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="user@example.com"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          Password * (min 6 characters)
        </label>
        <input
          id="password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="••••••••"
          required
          minLength={6}
        />
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-foreground mb-1">
          Full name
        </label>
        <input
          id="full_name"
          type="text"
          value={form.full_name}
          onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
          Role *
        </label>
        <select
          id="role"
          value={form.role}
          onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {(Object.keys(ROLES) as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r]}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton loading={loading} loadingLabel="Creating…">
        Create user
      </SubmitButton>
    </form>
  );
}
