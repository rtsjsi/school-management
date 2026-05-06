"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
        // Find active academic year
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

      // Get budget for this head in the active academic year
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

      // Sum expenses for this head within the academic year date range (if dates present)
      let query = supabase
        .from("expenses")
        .select("amount")
        .eq("expense_head_id", expenseHeadId);

      if (year.start_date && year.end_date) {
        query = query.gte("expense_date", year.start_date as string).lte("expense_date", year.end_date as string);
      }

      const { data: rows } = await query;
      const spent = (rows ?? []).reduce((s, r) => s + Number((r as { amount?: number }).amount ?? 0), 0);
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
    account?: string; // payment_mode: cash, cheque, online
    description?: string;
    expense_date?: string;
    cheque_number?: string;
    cheque_bank?: string;
    cheque_date?: string;
    transaction_reference_id?: string;
  };
  onSuccess?: () => void;
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
    account: (initialValues?.account as string) ?? "",
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
        account: initialValues.account ?? "",
        description: initialValues.description ?? "",
        expense_date: initialValues.expense_date ?? new Date().toISOString().slice(0, 10),
        cheque_number: initialValues.cheque_number ?? "",
        cheque_bank: initialValues.cheque_bank ?? "",
        cheque_date: initialValues.cheque_date ?? "",
        transaction_reference_id: initialValues.transaction_reference_id ?? "",
      });
    } else {
      setForm({
        voucher: "",
        expense_head_id: "",
        party: "NIL",
        amount: "",
        expense_by: "",
        account: "",
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
        cheque_number: "",
        cheque_bank: "",
        cheque_date: "",
        transaction_reference_id: "",
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
    if (!form.account) {
      setError("Please select a payment method.");
      return;
    }
    if (form.account === "cheque" && !form.cheque_number?.trim()) {
      setError("Cheque number is required for cheque payment.");
      return;
    }
    if (form.account === "online" && !form.transaction_reference_id?.trim()) {
      setError("Transaction ID is required for online payment.");
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
        account: "",
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
        cheque_number: "",
        cheque_bank: "",
        cheque_date: "",
        transaction_reference_id: "",
      });
      router.refresh();
      onSuccess?.();
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
      account: "",
      description: "",
      expense_date: new Date().toISOString().slice(0, 10),
      cheque_number: "",
      cheque_bank: "",
      cheque_date: "",
      transaction_reference_id: "",
    });
  };

  return (    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">{error}</p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Row 1 */}
        <div className="space-y-1.5">
          <Label htmlFor="expense-date" className="text-xs font-medium text-muted-foreground">Date</Label>
          <DatePicker
            value={form.expense_date}
            onChange={(isoDate) => setForm((p) => ({ ...p, expense_date: isoDate }))}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-voucher" className="text-xs font-medium text-muted-foreground">Voucher</Label>
          <Input
            id="expense-voucher"
            value={form.voucher}
            onChange={(e) => setForm((p) => ({ ...p, voucher: e.target.value }))}
            placeholder="Voucher no"
            className="h-9 text-sm"
          />
        </div>

        {/* Row 2 */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Expense Head</Label>
          <Select
            value={form.expense_head_id}
            onValueChange={(v) => setForm((p) => ({ ...p, expense_head_id: v }))}
          >
            <SelectTrigger className="h-9 text-sm">
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
        <div className="space-y-1.5">
          <Label htmlFor="expense-party" className="text-xs font-medium text-muted-foreground">Party</Label>
          <Input
            id="expense-party"
            value={form.party}
            onChange={(e) => setForm((p) => ({ ...p, party: e.target.value }))}
            placeholder="NIL"
            className="h-9 text-sm"
          />
        </div>

        {/* Row 3 */}
        <div className="space-y-1.5">
          <Label htmlFor="expense-amount" className="text-xs font-medium text-muted-foreground">Total Amount *</Label>
          <Input
            id="expense-amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
            placeholder="0.00"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-by" className="text-xs font-medium text-muted-foreground">Expense By</Label>
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
                value={form.expense_by && employees.some((e) => e.full_name === form.expense_by) ? form.expense_by : "none"}
                onValueChange={(v) => v !== "none" && setForm((p) => ({ ...p, expense_by: v }))}
              >
                <SelectTrigger className="w-36 h-9 text-sm">
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

        {/* Row 4 - Full width */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="expense-desc" className="text-xs font-medium text-muted-foreground">Description</Label>
          <Input
            id="expense-desc"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Optional"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-border/50">
        <div className="space-y-1.5">
          <Label htmlFor="expense-payment-method" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Payment Method *
          </Label>
          <Select
            value={form.account || undefined}
            onValueChange={(v) => setForm((p) => ({ ...p, account: v }))}
          >
            <SelectTrigger id="expense-payment-method" className="h-9 text-sm">
              <SelectValue placeholder="Select payment" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.account === "cheque" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="expense-cheque-bank" className="text-xs font-medium text-muted-foreground">Bank</Label>
              <Input
                id="expense-cheque-bank"
                value={form.cheque_bank}
                onChange={(e) => setForm((p) => ({ ...p, cheque_bank: e.target.value }))}
                placeholder="Bank"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-cheque-number" className="text-xs font-medium text-muted-foreground">Chq # *</Label>
              <Input
                id="expense-cheque-number"
                value={form.cheque_number}
                onChange={(e) => setForm((p) => ({ ...p, cheque_number: e.target.value }))}
                placeholder="No."
                className="h-9 text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-cheque-date" className="text-xs font-medium text-muted-foreground">Chq date *</Label>
              <DatePicker
                value={form.cheque_date}
                onChange={(isoDate) => setForm((p) => ({ ...p, cheque_date: isoDate }))}
                className="h-9 text-sm"
              />
            </div>
          </>
        )}

        {form.account === "online" && (
          <div className="space-y-1.5">
            <Label htmlFor="expense-txn-ref" className="text-xs font-medium text-muted-foreground">Txn ID *</Label>
            <Input
              id="expense-txn-ref"
              value={form.transaction_reference_id}
              onChange={(e) => setForm((p) => ({ ...p, transaction_reference_id: e.target.value }))}
              placeholder="ID"
              className="h-9 text-sm"
              required
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-end pt-2">
        {editingId && (
          <Button type="button" variant="outline" size="sm" onClick={handleNew}>
            Cancel
          </Button>
        )}
        <SubmitButton loading={loading} loadingLabel="Saving…" className="h-9 px-6 text-sm font-semibold shadow-none">
          {editingId ? "Update" : "Add"} Expense
        </SubmitButton>
      </div>
    </form>
  );
}
