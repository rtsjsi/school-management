"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FEE_TYPES = ["tuition", "transport", "library", "lab", "sports", "other"] as const;

type StudentOption = { id: string; full_name: string; is_rte_quota?: boolean };

export default function FeeDueForm({ students }: { students: StudentOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    fee_type: "tuition",
    quarter: "1",
    academic_year: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1).toString().slice(-2),
    due_date: "",
    discount_percent: "",
    discount_amount: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.student_id) {
      setError("Select a student.");
      return;
    }
    const selectedStudent = students.find((s) => s.id === form.student_id);
    if (selectedStudent?.is_rte_quota) {
      setError("RTE quota students have no fees. Cannot add fee due.");
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter valid amount.");
      return;
    }
    if (!form.due_date) {
      setError("Due date required.");
      return;
    }

    const discountPct = form.discount_percent ? parseFloat(form.discount_percent) : 0;
    const discountAmt = form.discount_amount ? parseFloat(form.discount_amount) : 0;
    if ((discountPct > 0 || discountAmt > 0) && (discountPct < 0 || discountPct > 100)) {
      setError("Discount percent must be 0-100.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from("fees").insert({
        student_id: form.student_id,
        amount,
        fee_type: form.fee_type,
        quarter: parseInt(form.quarter),
        academic_year: form.academic_year,
        due_date: form.due_date,
        status: "pending",
        discount_percent: discountPct || 0,
        discount_amount: discountAmt || 0,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setForm({ ...form, student_id: "", amount: "", due_date: "", discount_percent: "", discount_amount: "" });
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-semibold">Add Fee Due</h4>
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Student</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm((p) => ({ ...p, student_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Fee Type</Label>
          <Select value={form.fee_type} onValueChange={(v) => setForm((p) => ({ ...p, fee_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FEE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quarter</Label>
          <Select value={form.quarter} onValueChange={(v) => setForm((p) => ({ ...p, quarter: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Academic Year</Label>
          <Input value={form.academic_year} onChange={(e) => setForm((p) => ({ ...p, academic_year: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Discount % (optional)</Label>
          <Input type="number" min={0} max={100} step={0.01} value={form.discount_percent} onChange={(e) => setForm((p) => ({ ...p, discount_percent: e.target.value }))} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>Discount Amount (optional)</Label>
          <Input type="number" min={0} step={0.01} value={form.discount_amount} onChange={(e) => setForm((p) => ({ ...p, discount_amount: e.target.value }))} placeholder="0" />
        </div>
      </div>
      <SubmitButton loading={loading} loadingLabel="Adding…">Add Due</SubmitButton>
    </form>
  );
}
