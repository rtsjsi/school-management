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

function RemainingBudget({ expenseHeadId }: { expenseHeadId: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: head } = await supabase
        .from("expense_heads")
        .select("budget")
        .eq("id", expenseHeadId)
        .single();
      const budget = head?.budget != null ? Number(head.budget) : null;
      if (budget == null) {
        setRemaining(null);
        setLoading(false);
        return;
      }
      const { data: rows } = await supabase
        .from("expenses")
        .select("amount")
        .eq("expense_head_id", expenseHeadId);
      const spent = (rows ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      setRemaining(Math.max(0, budget - spent));
      setLoading(false);
    })();
  }, [expenseHeadId]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading budget…</p>;
  if (remaining === null) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Remaining budget: <span className="font-medium text-foreground">{remaining.toLocaleString()}</span>
    </p>
  );
}

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;

type ExpenseHead = { id: string; name: string; budget?: number | null };

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
    account?: string; // payment_mode: cash, cheque, online
    description?: string;
    expense_date?: string;
    cheque_number?: string;
    cheque_bank?: string;
    cheque_date?: string;
    transaction_reference_id?: string;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    voucher: initialValues?.voucher ?? "",
    expense_head_id: initialValues?.expense_head_id ?? "",
    party: initialValues?.party ?? "NIL",
    amount: initialValues?.amount?.toString() ?? "",
    expense_by: initialValues?.expense_by ?? "",
    account: (initialValues?.account as string) ?? "cash",
    description: initialValues?.description ?? "",
    expense_date: initialValues?.expense_date ?? new Date().toISOString().slice(0, 10),
    cheque_number: initialValues?.cheque_number ?? "",
    cheque_bank: initialValues?.cheque_bank ?? "",
    cheque_date: initialValues?.cheque_date ?? "",
    transaction_reference_id: initialValues?.transaction_reference_id ?? "",
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        voucher: initialValues.voucher ?? "",
        expense_head_id: initialValues.expense_head_id ?? "",
        party: initialValues.party ?? "NIL",
        amount: initialValues.amount?.toString() ?? "",
        expense_by: initialValues.expense_by ?? "",
        account: initialValues.account ?? "cash",
        description: initialValues.description ?? "",
        expense_date: initialValues.expense_date ?? new Date().toISOString().slice(0, 10),
        cheque_number: initialValues.cheque_number ?? "",
        cheque_bank: initialValues.cheque_bank ?? "",
        cheque_date: initialValues.cheque_date ?? "",
        transaction_reference_id: initialValues.transaction_reference_id ?? "",
      });
    }
  }, [initialValues, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (form.account === "cheque" && !form.cheque_number?.trim()) {
      setError("Cheque number is required for cheque payment.");
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
        cheque_number: form.account === "cheque" ? form.cheque_number.trim() || null : null,
        cheque_bank: form.account === "cheque" ? form.cheque_bank.trim() || null : null,
        cheque_date: form.account === "cheque" && form.cheque_date ? form.cheque_date : null,
        transaction_reference_id: form.account === "online" ? form.transaction_reference_id.trim() || null : null,
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
        account: "cash",
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
        cheque_number: "",
        cheque_bank: "",
        cheque_date: "",
        transaction_reference_id: "",
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
      account: "cash",
      description: "",
      expense_date: new Date().toISOString().slice(0, 10),
      cheque_number: "",
      cheque_bank: "",
      cheque_date: "",
      transaction_reference_id: "",
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
        <Select
          value={form.expense_head_id}
          onValueChange={(v) => setForm((p) => ({ ...p, expense_head_id: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select head" />
          </SelectTrigger>
          <SelectContent>
            {expenseHeads.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.expense_head_id && (
          <RemainingBudget expenseHeadId={form.expense_head_id} />
        )}
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
        <Label>Payment Mode</Label>
        <Select value={form.account} onValueChange={(v) => setForm((p) => ({ ...p, account: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_MODES.map((m) => (
              <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.account === "cheque" && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="text-sm font-semibold">Cheque Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-cheque-number">Cheque Number *</Label>
              <Input
                id="expense-cheque-number"
                value={form.cheque_number}
                onChange={(e) => setForm((p) => ({ ...p, cheque_number: e.target.value }))}
                placeholder="e.g. 123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-cheque-bank">Bank Name</Label>
              <Input
                id="expense-cheque-bank"
                value={form.cheque_bank}
                onChange={(e) => setForm((p) => ({ ...p, cheque_bank: e.target.value }))}
                placeholder="Bank name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-cheque-date">Cheque Date</Label>
              <Input
                id="expense-cheque-date"
                type="date"
                value={form.cheque_date}
                onChange={(e) => setForm((p) => ({ ...p, cheque_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {form.account === "online" && (
        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="text-sm font-semibold">Online Transaction Details</h4>
          <div className="space-y-2">
            <Label htmlFor="expense-txn-ref">Transaction Reference ID</Label>
            <Input
              id="expense-txn-ref"
              value={form.transaction_reference_id}
              onChange={(e) => setForm((p) => ({ ...p, transaction_reference_id: e.target.value }))}
              placeholder="Reference or transaction ID"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="expense-desc">Description</Label>
        <Input
          id="expense-desc"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <div className="flex flex-wrap gap-2 justify-start">
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
