"use client";

import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const ACCOUNTS = ["CASH", "BANK", "OTHER"] as const;

type ExpenseHead = { id: string; name: string };

export default function ExpenseEntryForm({
  expenseHeads,
  employees,
  onEdit,
  editingId,
  initialValues,
}: {
  expenseHeads: ExpenseHead[];
  employees?: { id: string; full_name: string }[];
  onEdit?: (id: string | null) => void;
  editingId?: string | null;
  initialValues?: {
    voucher?: string;
    expense_head_id?: string;
    party?: string;
    amount?: number;
    expense_by?: string;
    account?: string;
    description?: string;
    expense_date?: string;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heads, setHeads] = useState<ExpenseHead[]>(expenseHeads);
  const [newHeadName, setNewHeadName] = useState("");
  const [form, setForm] = useState({
    voucher: initialValues?.voucher ?? "",
    expense_head_id: initialValues?.expense_head_id ?? "",
    party: initialValues?.party ?? "NIL",
    amount: initialValues?.amount?.toString() ?? "",
    expense_by: initialValues?.expense_by ?? "",
    account: (initialValues?.account as string) ?? "CASH",
    description: initialValues?.description ?? "",
    expense_date: initialValues?.expense_date ?? new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        voucher: initialValues.voucher ?? "",
        expense_head_id: initialValues.expense_head_id ?? "",
        party: initialValues.party ?? "NIL",
        amount: initialValues.amount?.toString() ?? "",
        expense_by: initialValues.expense_by ?? "",
        account: initialValues.account ?? "CASH",
        description: initialValues.description ?? "",
        expense_date: initialValues.expense_date ?? new Date().toISOString().slice(0, 10),
      });
    }
  }, [initialValues, editingId]);

  const handleAddHead = async () => {
    if (!newHeadName.trim()) return;
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("expense_heads")
      .insert({ name: newHeadName.trim() })
      .select("id, name")
      .single();
    if (!err && data) {
      setHeads((p) => [...p, data as ExpenseHead]);
      setForm((f) => ({ ...f, expense_head_id: (data as ExpenseHead).id }));
      setNewHeadName("");
    }
  };

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
      const payload = {
        voucher: form.voucher.trim() || null,
        expense_head_id: form.expense_head_id || null,
        party: form.party.trim() || null,
        amount,
        expense_by: form.expense_by.trim() || null,
        account: form.account,
        description: form.description.trim() || null,
        expense_date: form.expense_date,
        category: "other",
      };

      if (editingId) {
        await supabase.from("expenses").update(payload).eq("id", editingId);
        onEdit?.(null);
      } else {
        await supabase.from("expenses").insert(payload);
      }

      setForm({
        voucher: "",
        expense_head_id: "",
        party: "NIL",
        amount: "",
        expense_by: "",
        account: "CASH",
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

  const handleNew = () => {
    onEdit?.(null);
    setForm({
      voucher: "",
      expense_head_id: "",
      party: "NIL",
      amount: "",
      expense_by: "",
      account: "CASH",
      description: "",
      expense_date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
      )}
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
        <Label htmlFor="expense-voucher">Voucher</Label>
        <Input
          id="expense-voucher"
          value={form.voucher}
          onChange={(e) => setForm((p) => ({ ...p, voucher: e.target.value }))}
          placeholder="Voucher no"
        />
      </div>
      <div className="space-y-2">
        <Label>Expense Head</Label>
        <div className="flex gap-2">
          <Select
            value={form.expense_head_id}
            onValueChange={(v) => setForm((p) => ({ ...p, expense_head_id: v }))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select head" />
            </SelectTrigger>
            <SelectContent>
              {heads.map((h) => (
                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Input
              placeholder="New head"
              value={newHeadName}
              onChange={(e) => setNewHeadName(e.target.value)}
              className="w-24"
            />
            <Button type="button" size="icon" variant="outline" onClick={handleAddHead}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense-party">Party</Label>
        <Input
          id="expense-party"
          value={form.party}
          onChange={(e) => setForm((p) => ({ ...p, party: e.target.value }))}
          placeholder="NIL"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense-amount">Total Amount *</Label>
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
      <div className="space-y-2">
        <Label htmlFor="expense-by">Expense By</Label>
        <div className="flex gap-2">
          <Input
            id="expense-by"
            value={form.expense_by}
            onChange={(e) => setForm((p) => ({ ...p, expense_by: e.target.value }))}
            placeholder="e.g. Mrs Ranjeeta"
            className="flex-1"
          />
          {employees && employees.length > 0 && (
            <Select
              value={form.expense_by && employees.some((e) => e.full_name === form.expense_by) ? form.expense_by : "none"}
              onValueChange={(v) => v !== "none" && setForm((p) => ({ ...p, expense_by: v }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="From list" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.full_name}>{emp.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Account</Label>
        <Select value={form.account} onValueChange={(v) => setForm((p) => ({ ...p, account: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNTS.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="expense-desc">Description</Label>
        <Input
          id="expense-desc"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <SubmitButton loading={loading} loadingLabel="Saving…">
          {editingId ? "Update" : "Add"} expense
        </SubmitButton>
        {editingId && (
          <Button type="button" variant="outline" onClick={handleNew}>
            New
          </Button>
        )}
      </div>
    </form>
  );
}
