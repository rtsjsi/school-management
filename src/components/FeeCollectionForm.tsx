"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";

const FEE_TYPES = ["tuition", "transport", "library", "lab", "sports", "other"] as const;
const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
const DEFAULT_POLICY_NOTES = [
  "(1) Fees will not be refunded in any case.",
  "(2) Fees are not transferable.",
  "(3) Cheque payment subject to realisation.",
];

type StudentOption = { id: string; full_name: string; grade?: string; section?: string; roll_number?: number; student_id?: string };

export default function FeeCollectionForm({
  students,
  receivedBy,
}: {
  students: StudentOption[];
  receivedBy?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    fee_type: "tuition" as string,
    quarter: "1",
    academic_year: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1).toString().slice(-2),
    payment_mode: "cash" as string,
    concession_amount: "",
    period_label: "",
    cheque_number: "",
    cheque_bank: "",
    cheque_date: "",
    online_transaction_id: "",
    online_transaction_ref: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/receipt-number")
      .then((r) => r.json())
      .then((d) => d.receiptNumber && setReceiptNumber(d.receiptNumber))
      .catch(() => {});
  }, []);

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
    const concessionAmount = form.concession_amount.trim() ? parseFloat(form.concession_amount) : 0;
    if (isNaN(concessionAmount) || concessionAmount < 0) {
      setError("Concession must be a non-negative number.");
      return;
    }
    if (form.payment_mode === "cheque" && !form.cheque_number?.trim()) {
      setError("Cheque number is required for cheque payment.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { data: existingFee } = await supabase
        .from("fees")
        .select("id, amount, paid_amount, discount_percent, discount_amount")
        .eq("student_id", form.student_id)
        .eq("quarter", parseInt(form.quarter))
        .eq("academic_year", form.academic_year)
        .eq("fee_type", form.fee_type)
        .or("status.eq.pending,status.eq.partial,status.eq.overdue")
        .limit(1)
        .maybeSingle();

      const { data: collection, error: err } = await supabase
        .from("fee_collections")
        .insert({
          student_id: form.student_id,
          amount,
          fee_type: form.fee_type,
          quarter: parseInt(form.quarter),
          academic_year: form.academic_year,
          payment_mode: form.payment_mode,
          concession_amount: concessionAmount,
          period_label: form.period_label.trim() || null,
          cheque_number: form.payment_mode === "cheque" ? form.cheque_number.trim() : null,
          cheque_bank: form.payment_mode === "cheque" ? form.cheque_bank.trim() || null : null,
          cheque_date: form.payment_mode === "cheque" && form.cheque_date ? form.cheque_date : null,
          online_transaction_id: form.payment_mode === "online" ? form.online_transaction_id.trim() || null : null,
          online_transaction_ref: form.payment_mode === "online" ? form.online_transaction_ref.trim() || null : null,
          receipt_number: receiptNumber,
          notes: form.notes.trim() || null,
          fee_id: existingFee?.id ?? null,
        })
        .select("id, students(full_name), collected_at")
        .single();

      if (err) {
        setError(err.message);
        return;
      }

      if (existingFee) {
        const prevPaid = Number((existingFee as { paid_amount?: number }).paid_amount ?? 0);
        const newPaid = prevPaid + amount + concessionAmount;
        const baseAmount = Number(existingFee.amount);
        const discountPct = Number((existingFee as { discount_percent?: number }).discount_percent ?? 0);
        const discountAmt = Number((existingFee as { discount_amount?: number }).discount_amount ?? 0);
        const total = Math.max(0, baseAmount - baseAmount * (discountPct / 100) - discountAmt);
        const status = newPaid >= total ? "paid" : "partial";
        await supabase
          .from("fees")
          .update({ paid_amount: newPaid, status, paid_at: new Date().toISOString() })
          .eq("id", existingFee.id);
      }

      const studentName = Array.isArray(collection?.students)
        ? (collection?.students[0] as { full_name?: string })?.full_name ?? "—"
        : (collection?.students as { full_name?: string } | null)?.full_name ?? "—";

      const selectedStudent = students.find((s) => s.id === form.student_id);

      const pdfBlob = generateReceiptPDF({
        receiptNumber,
        studentName,
        amount,
        paymentMode: form.payment_mode,
        quarter: parseInt(form.quarter),
        academicYear: form.academic_year,
        feeType: form.fee_type,
        collectedAt: new Date((collection as { collected_at?: string })?.collected_at ?? Date.now()).toISOString(),
        concessionAmount: concessionAmount > 0 ? concessionAmount : undefined,
        periodLabel: form.period_label.trim() || undefined,
        amountInWords: amountInWords(amount + concessionAmount),
        receivedBy,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: form.payment_mode === "cheque" ? form.cheque_number : undefined,
        chequeBank: form.payment_mode === "cheque" ? form.cheque_bank : undefined,
        chequeDate: form.payment_mode === "cheque" && form.cheque_date ? form.cheque_date : undefined,
        onlineTransactionId: form.payment_mode === "online" ? form.online_transaction_id : undefined,
        onlineTransactionRef: form.payment_mode === "online" ? form.online_transaction_ref : undefined,
        schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "School",
        schoolAddress: process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "",
        grade: selectedStudent?.grade,
        section: selectedStudent?.section,
        rollNumber: selectedStudent?.roll_number,
        grNo: selectedStudent?.student_id ?? selectedStudent?.id?.slice(0, 8),
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setForm({
        student_id: "",
        amount: "",
        fee_type: "tuition",
        quarter: "1",
        academic_year: form.academic_year,
        payment_mode: "cash",
        concession_amount: "",
        period_label: "",
        cheque_number: "",
        cheque_bank: "",
        cheque_date: "",
        online_transaction_id: "",
        online_transaction_ref: "",
        notes: "",
      });
      fetch("/api/receipt-number")
        .then((r) => r.json())
        .then((d) => d.receiptNumber && setReceiptNumber(d.receiptNumber))
        .catch(() => {});

      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>
          )}

          <div className="space-y-2">
            <Label>Receipt No.</Label>
            <Input value={receiptNumber} readOnly className="bg-muted font-mono" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select value={form.student_id} onValueChange={(v) => setForm((p) => ({ ...p, student_id: v }))}>
              <SelectTrigger id="student">
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
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee_type">Fee Type</Label>
              <Select value={form.fee_type} onValueChange={(v) => setForm((p) => ({ ...p, fee_type: v }))}>
                <SelectTrigger id="fee_type">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter *</Label>
              <Select value={form.quarter} onValueChange={(v) => setForm((p) => ({ ...p, quarter: v }))}>
                <SelectTrigger id="quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AcademicYearSelect
              value={form.academic_year}
              onChange={(v) => setForm((p) => ({ ...p, academic_year: v }))}
              id="academic_year"
              label="Academic Year *"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_label">Period label (e.g. Dec – Feb)</Label>
              <Input
                id="period_label"
                value={form.period_label}
                onChange={(e) => setForm((p) => ({ ...p, period_label: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="concession_amount">Fee concession (Rs.)</Label>
              <Input
                id="concession_amount"
                type="number"
                min={0}
                step={0.01}
                value={form.concession_amount}
                onChange={(e) => setForm((p) => ({ ...p, concession_amount: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_mode">Payment Mode *</Label>
            <Select value={form.payment_mode} onValueChange={(v) => setForm((p) => ({ ...p, payment_mode: v }))}>
              <SelectTrigger id="payment_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.payment_mode === "cheque" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="text-sm font-semibold">Cheque Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cheque_number">Cheque Number *</Label>
                  <Input
                    id="cheque_number"
                    value={form.cheque_number}
                    onChange={(e) => setForm((p) => ({ ...p, cheque_number: e.target.value }))}
                    placeholder="e.g. 123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cheque_bank">Bank</Label>
                  <Input
                    id="cheque_bank"
                    value={form.cheque_bank}
                    onChange={(e) => setForm((p) => ({ ...p, cheque_bank: e.target.value }))}
                    placeholder="Bank name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cheque_date">Cheque Date</Label>
                  <Input
                    id="cheque_date"
                    type="date"
                    value={form.cheque_date}
                    onChange={(e) => setForm((p) => ({ ...p, cheque_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {form.payment_mode === "online" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="text-sm font-semibold">Online Transaction Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="online_txn_id">Transaction ID</Label>
                  <Input
                    id="online_txn_id"
                    value={form.online_transaction_id}
                    onChange={(e) => setForm((p) => ({ ...p, online_transaction_id: e.target.value }))}
                    placeholder="Txn ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="online_txn_ref">Reference</Label>
                  <Input
                    id="online_txn_ref"
                    value={form.online_transaction_ref}
                    onChange={(e) => setForm((p) => ({ ...p, online_transaction_ref: e.target.value }))}
                    placeholder="Reference no"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <SubmitButton loading={loading} loadingLabel="Saving & generating receipt…" className="w-full">
            Collect Fee & Download Receipt
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
