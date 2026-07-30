"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  computeExpensePaymentTotals,
  expensePaymentStatusLabel,
} from "@/lib/expense-payments";
import { formatExpenseDisplayDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;

export type ExpenseBillSummary = {
  id: string;
  expense_date: string;
  voucher: string | null;
  party: string | null;
  amount: number;
  expense_heads?: { name: string } | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  cheque_number: string | null;
  cheque_bank: string | null;
  cheque_date: string | null;
  transaction_reference_id: string | null;
  remarks: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseBillSummary | null;
  canEdit?: boolean;
  onChanged?: () => void;
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensePaymentsDialog({
  open,
  onOpenChange,
  expense,
  canEdit = true,
  onChanged,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<(typeof PAYMENT_MODES)[number] | "">("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [remarks, setRemarks] = useState("");

  const billAmount = Number(expense?.amount ?? 0);
  const paidTotal = payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totals = computeExpensePaymentTotals(billAmount, paidTotal);

  const resetForm = useCallback((maxBalance?: number) => {
    setPaymentDate(todayISODate());
    setAmount(maxBalance != null && maxBalance > 0 ? String(maxBalance) : "");
    setMode("");
    setChequeNumber("");
    setChequeBank("");
    setChequeDate("");
    setTxnRef("");
    setRemarks("");
    setError(null);
  }, []);

  const loadPayments = useCallback(async () => {
    if (!expense?.id) return;
    setLoading(true);
    try {
      const { data, error: qErr } = await supabase
        .from("expense_payments")
        .select(
          "id, amount, payment_date, payment_mode, cheque_number, cheque_bank, cheque_date, transaction_reference_id, remarks"
        )
        .eq("expense_id", expense.id)
        .order("payment_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (qErr) throw qErr;
      const rows = (data ?? []) as PaymentRow[];
      setPayments(rows);
      const paid = rows.reduce((s, p) => s + Number(p.amount ?? 0), 0);
      const bal = computeExpensePaymentTotals(Number(expense.amount), paid).balance;
      resetForm(bal);
    } catch (err) {
      toast({
        title: "Failed to load payments",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [expense, resetForm, supabase]);

  useEffect(() => {
    if (open && expense?.id) {
      void loadPayments();
    }
    if (!open) {
      setPayments([]);
      resetForm();
    }
  }, [open, expense?.id, loadPayments, resetForm]);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!expense?.id || !canEdit) return;
    setError(null);

    const amt = parseFloat(amount);
    if (!paymentDate) {
      setError("Payment date is required.");
      return;
    }
    if (!mode) {
      setError("Select a payment mode.");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }
    if (amt - totals.balance > 0.001) {
      setError(
        `Amount exceeds remaining balance (₹${totals.balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}).`
      );
      return;
    }
    if (mode === "cheque" && !chequeNumber.trim()) {
      setError("Cheque number is required for cheque payment.");
      return;
    }
    if (mode === "online" && !txnRef.trim()) {
      setError("Transaction ID is required for online payment.");
      return;
    }

    setSaving(true);
    try {
      const { error: insErr } = await supabase.from("expense_payments").insert({
        expense_id: expense.id,
        amount: amt,
        payment_date: paymentDate,
        payment_mode: mode,
        cheque_number: mode === "cheque" ? chequeNumber.trim() || null : null,
        cheque_bank: mode === "cheque" ? chequeBank.trim() || null : null,
        cheque_date: mode === "cheque" && chequeDate ? chequeDate : null,
        transaction_reference_id: mode === "online" ? txnRef.trim() || null : null,
        remarks: remarks.trim() || null,
      });
      if (insErr) throw insErr;
      toast({ title: "Payment recorded" });
      await loadPayments();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment(payment: PaymentRow) {
    if (!canEdit) return;
    const ok = confirm(
      `Delete payment of ₹${Number(payment.amount).toLocaleString()} on ${formatExpenseDisplayDate(payment.payment_date)}?`
    );
    if (!ok) return;
    try {
      const { error: delErr } = await supabase
        .from("expense_payments")
        .delete()
        .eq("id", payment.id);
      if (delErr) throw delErr;
      toast({ title: "Payment deleted" });
      await loadPayments();
      onChanged?.();
    } catch (err) {
      toast({
        title: "Failed to delete payment",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  const statusVariant =
    totals.status === "paid"
      ? "default"
      : totals.status === "partial"
        ? "secondary"
        : "outline";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record payments</DialogTitle>
          <DialogDescription>
            Add partial or full payments against this expense bill.
          </DialogDescription>
        </DialogHeader>

        {expense && (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/20 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Voucher</p>
                <p className="font-mono text-xs">{expense.voucher ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Party</p>
                <p>{expense.party ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Bill amount</p>
                <p className="font-semibold">₹{totals.bill.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={statusVariant} className="mt-0.5">
                  {expensePaymentStatusLabel(totals.status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p>₹{totals.paid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-medium">₹{totals.balance.toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Head</p>
                <p>{expense.expense_heads?.name ?? "—"}</p>
              </div>
            </div>

            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    {canEdit && <TableHead className="w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 5 : 4} className="h-20 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canEdit ? 5 : 4}
                        className="h-16 text-center text-muted-foreground text-sm"
                      >
                        No payments yet — bill is unpaid.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => {
                      const ref =
                        p.payment_mode === "cheque"
                          ? [p.cheque_number, p.cheque_bank].filter(Boolean).join(" · ") || "—"
                          : p.payment_mode === "online"
                            ? p.transaction_reference_id || "—"
                            : p.remarks || "—";
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">
                            {formatExpenseDisplayDate(p.payment_date)}
                          </TableCell>
                          <TableCell className="capitalize text-xs">{p.payment_mode}</TableCell>
                          <TableCell className="text-right font-medium">
                            {Number(p.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {ref}
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeletePayment(p)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {canEdit && totals.balance > 0.001 && (
              <form onSubmit={handleAddPayment} className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium">Add payment</h4>
                {error && (
                  <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded-md">
                    {error}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Date *</Label>
                    <DatePicker
                      value={paymentDate}
                      onChange={setPaymentDate}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Amount * (max {totals.balance.toLocaleString()})
                    </Label>
                    <Input
                      type="number"
                      min={0.01}
                      max={totals.balance}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mode *</Label>
                    <Select
                      value={mode || undefined}
                      onValueChange={(v) => setMode(v as (typeof PAYMENT_MODES)[number])}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((m) => (
                          <SelectItem key={m} value={m} className="capitalize">
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {mode === "cheque" && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Bank</Label>
                      <Input
                        value={chequeBank}
                        onChange={(e) => setChequeBank(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cheque # *</Label>
                      <Input
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        className="h-9 text-sm"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cheque date</Label>
                      <DatePicker
                        value={chequeDate}
                        onChange={setChequeDate}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                )}

                {mode === "online" && (
                  <div className="space-y-1.5 max-w-sm">
                    <Label className="text-xs text-muted-foreground">Txn ID *</Label>
                    <Input
                      value={txnRef}
                      onChange={(e) => setTxnRef(e.target.value)}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Remarks</Label>
                  <Input
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Optional"
                  />
                </div>

                <Button type="submit" disabled={saving} className="h-9">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add payment
                </Button>
              </form>
            )}

            {canEdit && totals.balance <= 0.001 && (
              <p className="text-sm text-muted-foreground border-t pt-3">
                This bill is fully paid. Delete a payment to adjust.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
