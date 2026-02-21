"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { AcademicYearSelect } from "@/components/AcademicYearSelect";
import { isGradeInRange } from "@/lib/grade-utils";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
const FEE_TYPE = "tuition";
const DEFAULT_POLICY_NOTES = [
  "(1) Fees will not be refunded in any case.",
  "(2) Fees are not transferable.",
  "(3) Cheque payment subject to realisation.",
];

type StudentOption = { id: string; full_name: string; grade?: string; division?: string; roll_number?: number; student_id?: string };

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
  const [structureAmount, setStructureAmount] = useState<number | null>(null);
  const [form, setForm] = useState({
    student_id: "",
    amount: "",
    quarter: "1",
    academic_year: "",
    payment_mode: "cash" as string,
    cheque_number: "",
    cheque_bank: "",
    cheque_date: "",
    online_transaction_id: "",
    online_transaction_ref: "",
    notes: "",
    collection_date: new Date().toISOString().slice(0, 10),
  });

  const school = useSchoolSettings();
  const classes = useMemo(() => {
    const grades = Array.from(new Set(students.map((s) => s.grade).filter(Boolean))) as string[];
    return grades.sort((a, b) => a.localeCompare(b));
  }, [students]);

  const divisions = useMemo(() => {
    const secs = Array.from(new Set(students.map((s) => s.division).filter(Boolean))) as string[];
    return secs.sort((a, b) => a.localeCompare(b));
  }, [students]);

  const [classFilter, setClassFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (classFilter !== "all" && s.grade !== classFilter) return false;
      if (divisionFilter !== "all" && s.division !== divisionFilter) return false;
      return true;
    });
  }, [students, classFilter, divisionFilter]);

  useEffect(() => {
    fetch("/api/receipt-number")
      .then((r) => r.json())
      .then((d) => d.receiptNumber && setReceiptNumber(d.receiptNumber))
      .catch(() => {});
  }, []);

  const selectedStudent = students.find((s) => s.id === form.student_id);

  useEffect(() => {
    if (!selectedStudent?.grade || !form.academic_year) {
      setStructureAmount(null);
      return;
    }
    const supabase = createClient();
    (async () => {
      const { data: structures } = await supabase
        .from("fee_structures")
        .select("id, grade_from, grade_to, fee_structure_items(fee_type, quarter, amount)")
        .eq("academic_year", form.academic_year);
      const structure = (structures ?? []).find((st) =>
        isGradeInRange(selectedStudent.grade ?? "", st.grade_from, st.grade_to)
      );
      if (!structure) {
        setStructureAmount(null);
        return;
      }
      const items = (structure.fee_structure_items as { fee_type: string; quarter: number; amount: number }[]) ?? [];
      const item = items.find((i) => i.fee_type === FEE_TYPE && i.quarter === parseInt(form.quarter));
      setStructureAmount(item ? Number(item.amount) : null);
    })();
  }, [selectedStudent?.grade, form.quarter, form.academic_year]);

  useEffect(() => {
    if (structureAmount != null) {
      setForm((p) => ({ ...p, amount: String(structureAmount) }));
    } else {
      setForm((p) => ({ ...p, amount: "" }));
    }
  }, [structureAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.student_id) {
      setError("Please select a student.");
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) {
      setError("Amount is required. Ensure fee structure exists for this student's standard and quarter.");
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
        .eq("fee_type", FEE_TYPE)
        .or("status.eq.pending,status.eq.partial,status.eq.overdue")
        .limit(1)
        .maybeSingle();

      const collectedAt = form.collection_date
        ? new Date(form.collection_date + "T12:00:00").toISOString()
        : new Date().toISOString();

      let enrollmentId: string | null = null;
      const { data: ayRow } = await supabase.from("academic_years").select("id").eq("name", form.academic_year).maybeSingle();
      if (ayRow?.id) {
        const { data: enrollRow } = await supabase
          .from("student_enrollments")
          .select("id")
          .eq("student_id", form.student_id)
          .eq("academic_year_id", ayRow.id)
          .maybeSingle();
        enrollmentId = enrollRow?.id ?? null;
      }

      const { data: collection, error: err } = await supabase
        .from("fee_collections")
        .insert({
          student_id: form.student_id,
          amount,
          fee_type: FEE_TYPE,
          quarter: parseInt(form.quarter),
          academic_year: form.academic_year,
          payment_mode: form.payment_mode,
          concession_amount: 0,
          period_label: null,
          cheque_number: form.payment_mode === "cheque" ? form.cheque_number.trim() : null,
          cheque_bank: form.payment_mode === "cheque" ? form.cheque_bank.trim() || null : null,
          cheque_date: form.payment_mode === "cheque" && form.cheque_date ? form.cheque_date : null,
          online_transaction_id: form.payment_mode === "online" ? form.online_transaction_id.trim() || null : null,
          online_transaction_ref: form.payment_mode === "online" ? form.online_transaction_ref.trim() || null : null,
          receipt_number: receiptNumber,
          notes: form.notes.trim() || null,
          fee_id: existingFee?.id ?? null,
          collected_at: collectedAt,
          collected_by: receivedBy ?? null,
          enrollment_id: enrollmentId,
        })
        .select("id, students(full_name), collected_at")
        .single();

      if (err) {
        setError(err.message);
        return;
      }

      if (existingFee) {
        const prevPaid = Number((existingFee as { paid_amount?: number }).paid_amount ?? 0);
        const newPaid = prevPaid + amount;
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

      let outstandingAfterPayment: number | undefined;
      const { data: structures } = await supabase
        .from("fee_structures")
        .select("id, grade_from, grade_to, fee_structure_items(quarter, amount)")
        .eq("academic_year", form.academic_year);
      const structure = (structures ?? []).find((st) =>
        isGradeInRange(selectedStudent?.grade ?? "", st.grade_from, st.grade_to)
      );
      if (structure) {
        const items = (structure.fee_structure_items as { quarter: number; amount: number }[]) ?? [];
        const totalDues = items.reduce((s, i) => s + Number(i.amount), 0);
        const { data: paidRows } = await supabase
          .from("fee_collections")
          .select("amount")
          .eq("student_id", form.student_id)
          .eq("academic_year", form.academic_year);
        const totalPaid = (paidRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
        const outstanding = Math.max(0, totalDues - totalPaid);
        if (outstanding > 0) outstandingAfterPayment = outstanding;
      }

      const pdfBlob = generateReceiptPDF({
        receiptNumber,
        studentName,
        amount,
        paymentMode: form.payment_mode,
        quarter: parseInt(form.quarter),
        academicYear: form.academic_year,
        feeType: FEE_TYPE,
        collectedAt: new Date((collection as { collected_at?: string })?.collected_at ?? Date.now()).toISOString(),
        amountInWords: amountInWords(amount),
        receivedBy,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: form.payment_mode === "cheque" ? form.cheque_number : undefined,
        chequeBank: form.payment_mode === "cheque" ? form.cheque_bank : undefined,
        chequeDate: form.payment_mode === "cheque" && form.cheque_date ? form.cheque_date : undefined,
        onlineTransactionId: form.payment_mode === "online" ? form.online_transaction_id : undefined,
        onlineTransactionRef: form.payment_mode === "online" ? form.online_transaction_ref : undefined,
        schoolName: school.name,
        schoolAddress: school.address,
        grade: selectedStudent?.grade,
        division: selectedStudent?.division,
        rollNumber: selectedStudent?.roll_number,
        grNo: selectedStudent?.student_id ?? selectedStudent?.id?.slice(0, 8),
        outstandingAfterPayment,
      });

      const url = URL.createObjectURL(pdfBlob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
        } catch {
          window.open(url, "_blank");
        }
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(iframe);
        }, 1000);
      };

      setForm({
        student_id: "",
        amount: "",
        quarter: "1",
        academic_year: form.academic_year,
        payment_mode: "cash",
        cheque_number: "",
        cheque_bank: "",
        cheque_date: "",
        online_transaction_id: "",
        online_transaction_ref: "",
        notes: "",
        collection_date: new Date().toISOString().slice(0, 10),
      });
      fetch("/api/receipt-number")
        .then((r) => r.json())
        .then((d) => d.receiptNumber && setReceiptNumber(d.receiptNumber))
        .catch(() => {});

      window.dispatchEvent(new CustomEvent("fee-collection-added"));
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Collected By</Label>
              <Input value={receivedBy ?? "—"} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection_date">Collection Date *</Label>
              <Input
                id="collection_date"
                type="date"
                value={form.collection_date}
                onChange={(e) => setForm((p) => ({ ...p, collection_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Receipt No.</Label>
            <Input value={receiptNumber} readOnly className="bg-muted font-mono" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select value={form.student_id} onValueChange={(v) => setForm((p) => ({ ...p, student_id: v }))}>
              <SelectTrigger id="student">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} {s.grade ? `(${s.grade}${s.division ? "-" + s.division : ""})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (from fee structure) *</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              readOnly
              className="bg-muted"
              placeholder={structureAmount === null && selectedStudent ? "No structure for this standard" : "0.00"}
            />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <SubmitButton loading={loading} loadingLabel="Saving & printing receipt…" className="w-full">
            Collect Fee & Print Receipt
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
