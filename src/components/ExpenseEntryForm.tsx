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

const EXPENSE_CATEGORIES = [
  "salary",
  "utilities",
  "supplies",
  "maintenance",
  "transport",
  "other",
] as const;

export default function ExpenseEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: "other" as string,
    amount: "",
    description: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("expenses").insert({
        category: form.category,
        amount,
        description: form.description.trim() || null,
        expense_date: form.expense_date,
      });

      if (err) {
        setError(err.message);
        return;
      }

      setForm({
        category: "other",
        amount: "",
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expense-category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
          >
            <SelectTrigger id="expense-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount *</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense-date">Date</Label>
        <Input
          id="expense-date"
          type="date"
          value={form.expense_date}
          onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense-desc">Description</Label>
        <Input
          id="expense-desc"
          type="text"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">
        Add expense
      </SubmitButton>
    </form>
  );
}
