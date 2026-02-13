"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FEE_TYPES = ["tuition", "transport", "library", "lab", "sports", "other"] as const;

type StudentOption = { id: string; full_name: string };

export default function FeeEntryForm({ students }: { students: StudentOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    fee_type: "tuition" as string,
    due_date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.student_id) {
      setError("Please select a student.");
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!form.due_date) {
      setError("Due date is required.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("fees").insert({
        student_id: form.student_id,
        amount,
        fee_type: form.fee_type,
        due_date: form.due_date,
        notes: form.notes.trim() || null,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setForm({ student_id: "", amount: "", fee_type: "tuition", due_date: "", notes: "" });
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
        <Label htmlFor="fee-student">Student *</Label>
        <Select value={form.student_id} onValueChange={(v) => setForm((p) => ({ ...p, student_id: v }))}>
          <SelectTrigger id="fee-student" className="w-full">
            <SelectValue placeholder="Select student" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fee-amount">Amount *</Label>
          <Input
            id="fee-amount"
            type="number"
            min={0}
            step={0.01}
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fee-type">Type</Label>
          <Select value={form.fee_type} onValueChange={(v) => setForm((p) => ({ ...p, fee_type: v }))}>
            <SelectTrigger id="fee-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FEE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fee-due">Due date *</Label>
        <Input
          id="fee-due"
          type="date"
          value={form.due_date}
          onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fee-notes">Notes</Label>
        <Input
          id="fee-notes"
          type="text"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <SubmitButton loading={loading} loadingLabel="Adding…" className="w-full">
        Add fee
      </SubmitButton>
    </form>
  );
}
