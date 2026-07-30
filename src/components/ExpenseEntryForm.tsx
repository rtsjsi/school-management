"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeExpenseText } from "@/lib/expense-payments";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
      const { data: year } = await supabase
        .from("academic_years")
        .select("id, start_date, end_date")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!year?.id) {
        setRemaining(null);
        setLoading(false);
        return;
      }

      const { data: budgetRow } = await supabase
        .from("expense_budgets")
        .select("amount")
        .eq("expense_head_id", expenseHeadId)
        .eq("academic_year_id", year.id)
        .maybeSingle();
      const budget = budgetRow?.amount != null ? Number(budgetRow.amount) : null;
      if (budget == null) {
        setRemaining(null);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("expenses")
        .select("amount")
        .eq("expense_head_id", expenseHeadId);

      if (year.start_date && year.end_date) {
        query = query
          .gte("expense_date", year.start_date as string)
          .lte("expense_date", year.end_date as string);
      }

      const { data: rows } = await query;
      const spent = (rows ?? []).reduce(
        (s, r) => s + Number((r as { amount?: number }).amount ?? 0),
        0
      );
      setRemaining(Math.max(0, budget - spent));
      setLoading(false);
    })();
  }, [expenseHeadId]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading budget…</p>;
  if (remaining === null) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Remaining budget:{" "}
      <span className="font-medium text-foreground">{remaining.toLocaleString()}</span>
    </p>
  );
}

type ExpenseHead = { id: string; name: string; budget?: number | null };

export default function ExpenseEntryForm({
  expenseHeads,
  employees,
  onEdit,
  editingId,
  initialValues,
  onSuccess,
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
    description?: string;
    expense_date?: string;
  };
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    voucher: initialValues?.voucher ?? "",
    expense_head_id: initialValues?.expense_head_id ?? "",
    party: initialValues?.party ?? "",
    amount: initialValues?.amount?.toString() ?? "",
    expense_by: initialValues?.expense_by ?? "",
    description: initialValues?.description ?? "",
    expense_date: initialValues?.expense_date ?? new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (initialValues) {
      setForm({
        voucher: initialValues.voucher ?? "",
        expense_head_id: initialValues.expense_head_id ?? "",
        party: initialValues.party ?? "",
        amount: initialValues.amount?.toString() ?? "",
        expense_by: initialValues.expense_by ?? "",
        description: initialValues.description ?? "",
        expense_date: initialValues.expense_date ?? new Date().toISOString().slice(0, 10),
      });
    } else {
      setForm({
        voucher: "",
        expense_head_id: "",
        party: "",
        amount: "",
        expense_by: "",
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [initialValues, editingId]);

  async function findDuplicateBill(opts: {
    voucher: string;
    expenseDate: string;
    party: string;
    amount: number;
    excludeId?: string | null;
  }) {
    const supabase = createClient();
    const voucherNorm = normalizeExpenseText(opts.voucher);
    const partyNorm = normalizeExpenseText(opts.party);

    let query = supabase
      .from("expenses")
      .select("id, voucher, party, amount, expense_date")
      .eq("expense_date", opts.expenseDate)
      .eq("amount", opts.amount);

    if (opts.excludeId) {
      query = query.neq("id", opts.excludeId);
    }

    const { data, error: qErr } = await query;
    if (qErr) throw qErr;

    return (data ?? []).find((row) => {
      return (
        normalizeExpenseText(row.voucher) === voucherNorm &&
        normalizeExpenseText(row.party) === partyNorm
      );
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(form.amount);
    if (!form.expense_date) {
      setError("Date is required.");
      return;
    }
    if (!form.voucher?.trim()) {
      setError("Voucher number is required.");
      return;
    }
    if (!form.expense_head_id) {
      setError("Expense head is required.");
      return;
    }
    if (!form.party?.trim()) {
      setError("Party name is required.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const duplicate = await findDuplicateBill({
        voucher: form.voucher,
        expenseDate: form.expense_date,
        party: form.party,
        amount,
        excludeId: editingId ?? null,
      });
      if (duplicate) {
        setError(
          "A bill with the same voucher, date, party, and amount already exists."
        );
        return;
      }

      const supabase = createClient();
      const payload = {
        voucher: form.voucher.trim() || null,
        expense_head_id: form.expense_head_id || null,
        party: form.party.trim() || null,
        amount,
        expense_by: form.expense_by.trim() || null,
        description: form.description.trim() || null,
        expense_date: form.expense_date,
        category: "other",
        // Bill-only: do not write legacy payment columns
        account: null,
        cheque_number: null,
        cheque_bank: null,
        cheque_date: null,
        transaction_reference_id: null,
      };

      if (editingId) {
        const { error: updErr } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingId);
        if (updErr) throw updErr;
        onEdit?.(null);
      } else {
        const { error: insErr } = await supabase.from("expenses").insert(payload);
        if (insErr) throw insErr;
      }

      setForm({
        voucher: "",
        expense_head_id: "",
        party: "",
        amount: "",
        expense_by: "",
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    onEdit?.(null);
    setForm({
      voucher: "",
      expense_head_id: "",
      party: "",
      amount: "",
      expense_by: "",
      description: "",
      expense_date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="expense-date" className="text-xs font-medium text-muted-foreground">
            Date *
          </Label>
          <DatePicker
            value={form.expense_date}
            onChange={(isoDate) => setForm((p) => ({ ...p, expense_date: isoDate }))}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-voucher" className="text-xs font-medium text-muted-foreground">
            Voucher No *
          </Label>
          <Input
            id="expense-voucher"
            value={form.voucher}
            onChange={(e) => setForm((p) => ({ ...p, voucher: e.target.value }))}
            placeholder="Voucher no"
            className="h-9 text-sm"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Expense Head *</Label>
          <Select
            value={form.expense_head_id}
            onValueChange={(v) => setForm((p) => ({ ...p, expense_head_id: v }))}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select head" />
            </SelectTrigger>
            <SelectContent>
              {expenseHeads.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.expense_head_id && <RemainingBudget expenseHeadId={form.expense_head_id} />}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-party" className="text-xs font-medium text-muted-foreground">
            Party Name *
          </Label>
          <Input
            id="expense-party"
            value={form.party}
            onChange={(e) => setForm((p) => ({ ...p, party: e.target.value }))}
            placeholder="Party name"
            className="h-9 text-sm"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expense-amount" className="text-xs font-medium text-muted-foreground">
            Bill Amount *
          </Label>
          <Input
            id="expense-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            placeholder="0.00"
            className="h-9 text-sm"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-by" className="text-xs font-medium text-muted-foreground">
            Expense By
          </Label>
          <div className="flex gap-2">
            <Input
              id="expense-by"
              value={form.expense_by}
              onChange={(e) => setForm((p) => ({ ...p, expense_by: e.target.value }))}
              placeholder="e.g. Mrs Ranjeeta"
              className="flex-1 h-9 text-sm"
            />
            {employees && employees.length > 0 && (
              <Select
                value={
                  form.expense_by && employees.some((e) => e.full_name === form.expense_by)
                    ? form.expense_by
                    : "none"
                }
                onValueChange={(v) =>
                  v !== "none" && setForm((p) => ({ ...p, expense_by: v }))
                }
              >
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="From list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.full_name}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="expense-desc" className="text-xs font-medium text-muted-foreground">
            Description
          </Label>
          <Input
            id="expense-desc"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional context"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Payments are recorded separately after saving the bill.
      </p>

      <div className="flex flex-wrap gap-2 justify-start pt-2">
        {editingId && (
          <Button type="button" variant="outline" size="sm" onClick={handleNew}>
            Cancel
          </Button>
        )}
        <SubmitButton
          loading={loading}
          loadingLabel="Saving…"
          className="h-9 px-6 text-sm font-semibold shadow-none"
        >
          {editingId ? "Update" : "Save"} Bill
        </SubmitButton>
      </div>
    </form>
  );
}
