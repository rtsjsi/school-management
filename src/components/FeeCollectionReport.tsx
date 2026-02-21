"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFeeTypeLabel } from "@/lib/utils";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { updateFeeCollection } from "@/app/dashboard/fees/actions";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Pencil, Download, Printer } from "lucide-react";
import { fetchClasses, fetchAcademicYears } from "@/lib/lov";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
const QUARTERS = [1, 2, 3, 4] as const;

type ReportRow = {
  id: string;
  receipt_number: string;
  student_name?: string;
  student_grade?: string;
  student_division?: string;
  student_roll_number?: number;
  student_gr_no?: string;
  amount: number;
  fee_type: string;
  quarter: number;
  academic_year: string;
  payment_mode: string;
  collected_at: string;
  collected_by?: string;
  cheque_number?: string;
  cheque_bank?: string;
  cheque_date?: string;
  online_transaction_id?: string;
  online_transaction_ref?: string;
};

const DEFAULT_POLICY_NOTES = [
  "(1) Fees will not be refunded in any case.",
  "(2) Fees are not transferable.",
  "(3) Cheque payment subject to realisation.",
];

type Summary = {
  totalCount: number;
  totalAmount: number;
  byMode: { payment_mode: string; count: number; total: number }[];
};

export default function FeeCollectionReport() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [useMonth, setUseMonth] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [students, setStudents] = useState<{ id: string; full_name: string; grade?: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<ReportRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<ReportRow | null>(null);
  const [editPaymentMode, setEditPaymentMode] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    fetch("/api/students?limit=500")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchClasses().then(setClasses).catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    fetchAcademicYears().then((y) => setYears(y.map(({ id, name }) => ({ id, name })))).catch(() => setYears([]));
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (useMonth) {
      params.set("month", month);
    } else {
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
    }
    if (academicYear) params.set("academicYear", academicYear);
    if (quarter) params.set("quarter", quarter);
    if (paymentMode) params.set("paymentMode", paymentMode);
    if (studentId) params.set("studentId", studentId);
    if (grade) params.set("grade", grade);

    fetch(`/api/fee-reports?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data ?? []);
        setSummary(d.summary ?? null);
      })
      .catch(() => {
        setData([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  };

  const openEdit = (row: ReportRow) => {
    setEditRow(row);
    setEditPaymentMode(row.payment_mode);
    setEditRemarks("");
    setEditError(null);
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditPaymentMode("");
    setEditRemarks("");
    setEditError(null);
  };

  const getReceiptData = async (row: ReportRow) => {
    const res = await fetch(`/api/receipt-data?id=${row.id}`);
    return res.ok ? res.json() : null;
  };

  const printReceipt = (row: ReportRow) => {
    getReceiptData(row).then((data) => {
      const d = data ?? {
        receiptNumber: row.receipt_number,
        studentName: row.student_name ?? "—",
        amount: Number(row.amount),
        paymentMode: row.payment_mode,
        quarter: row.quarter,
        academicYear: row.academic_year,
        feeType: row.fee_type,
        collectedAt: row.collected_at,
        collectedBy: row.collected_by,
        chequeNumber: row.cheque_number,
        chequeBank: row.cheque_bank,
        chequeDate: row.cheque_date,
        onlineTransactionId: row.online_transaction_id,
        onlineTransactionRef: row.online_transaction_ref,
        grade: row.student_grade,
        division: row.student_division,
        rollNumber: row.student_roll_number,
        grNo: row.student_gr_no,
      };
      const pdfBlob = generateReceiptPDF({
        receiptNumber: d.receiptNumber,
        studentName: d.studentName,
        amount: d.amount,
        paymentMode: d.paymentMode,
        quarter: d.quarter,
        academicYear: d.academicYear,
        feeType: d.feeType,
        collectedAt: d.collectedAt,
        amountInWords: amountInWords(d.amount),
        receivedBy: d.collectedBy,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: d.chequeNumber,
        chequeBank: d.chequeBank,
        chequeDate: d.chequeDate,
        onlineTransactionId: d.onlineTransactionId,
        onlineTransactionRef: d.onlineTransactionRef,
        schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "School",
        schoolAddress: process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "",
        grade: d.grade,
        division: d.division,
        rollNumber: d.rollNumber,
        grNo: d.grNo,
        outstandingAfterPayment: d.outstandingAfterPayment,
      });
      const url = URL.createObjectURL(pdfBlob);
      const w = window.open(url, "_blank");
      if (w) w.onload = () => w.print();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  };

  const downloadReceipt = (row: ReportRow) => {
    getReceiptData(row).then((data) => {
      const d = data ?? {
        receiptNumber: row.receipt_number,
        studentName: row.student_name ?? "—",
        amount: Number(row.amount),
        paymentMode: row.payment_mode,
        quarter: row.quarter,
        academicYear: row.academic_year,
        feeType: row.fee_type,
        collectedAt: row.collected_at,
        collectedBy: row.collected_by,
        chequeNumber: row.cheque_number,
        chequeBank: row.cheque_bank,
        chequeDate: row.cheque_date,
        onlineTransactionId: row.online_transaction_id,
        onlineTransactionRef: row.online_transaction_ref,
        grade: row.student_grade,
        division: row.student_division,
        rollNumber: row.student_roll_number,
        grNo: row.student_gr_no,
      };
      const pdfBlob = generateReceiptPDF({
        receiptNumber: d.receiptNumber,
        studentName: d.studentName,
        amount: d.amount,
        paymentMode: d.paymentMode,
        quarter: d.quarter,
        academicYear: d.academicYear,
        feeType: d.feeType,
        collectedAt: d.collectedAt,
        amountInWords: amountInWords(d.amount),
        receivedBy: d.collectedBy,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: d.chequeNumber,
        chequeBank: d.chequeBank,
        chequeDate: d.chequeDate,
        onlineTransactionId: d.onlineTransactionId,
        onlineTransactionRef: d.onlineTransactionRef,
        schoolName: process.env.NEXT_PUBLIC_SCHOOL_NAME ?? "School",
        schoolAddress: process.env.NEXT_PUBLIC_SCHOOL_ADDRESS ?? "",
        grade: d.grade,
        division: d.division,
        rollNumber: d.rollNumber,
        grNo: d.grNo,
        outstandingAfterPayment: d.outstandingAfterPayment,
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${d.receiptNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleEditSave = async () => {
    if (!editRow) return;
    setEditError(null);
    if (!editRemarks.trim()) {
      setEditError("Remarks are compulsory when modifying a fee collection entry.");
      return;
    }
    setEditLoading(true);
    const result = await updateFeeCollection(editRow.id, editPaymentMode, editRemarks);
    setEditLoading(false);
    if (result.ok) {
      closeEdit();
      fetchReport();
      router.refresh();
    } else {
      setEditError(result.error);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Fees Collection Report</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={useMonth ? "month" : "range"} onValueChange={(v) => setUseMonth(v === "month")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="range">Date range</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {useMonth ? (
              <div className="space-y-2">
                <Label>Month</Label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={academicYear || "all"} onValueChange={(v) => setAcademicYear(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.name}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={quarter || "all"} onValueChange={(v) => setQuarter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {QUARTERS.map((q) => (
                    <SelectItem key={q} value={String(q)}>
                      Q{q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode || "all"} onValueChange={(v) => setPaymentMode(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Select value={grade || "all"} onValueChange={(v) => setGrade(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={studentId || "all"} onValueChange={(v) => setStudentId(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} {s.grade ? `(${s.grade})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReport} disabled={loading}>
                {loading ? "Loading…" : "Generate Report"}
              </Button>
            </div>
          </div>

          {summary && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <h3 className="font-medium">Summary</h3>
              <div className="flex flex-wrap gap-6">
                <span>
                  <strong>{summary.totalCount}</strong> collection(s)
                </span>
                <span>
                  <strong>₹{summary.totalAmount.toLocaleString()}</strong> total
                </span>
                {summary.byMode.map((m) => (
                  <span key={m.payment_mode} className="capitalize">
                    {m.payment_mode}: {m.count} (₹{m.total.toLocaleString()})
                  </span>
                ))}
              </div>
            </div>
          )}

          {data !== null && (
            <div className="border rounded-lg overflow-x-auto">
              {data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qtr</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Collected By</TableHead>
                      <TableHead className="w-28"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.receipt_number}</TableCell>
                        <TableCell className="font-medium">{row.student_name ?? "—"}</TableCell>
                        <TableCell>
                          {[row.student_grade, row.student_division].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell>{Number(row.amount).toLocaleString()}</TableCell>
                        <TableCell>{getFeeTypeLabel(row.fee_type)}</TableCell>
                        <TableCell>Q{row.quarter}</TableCell>
                        <TableCell className="capitalize">{row.payment_mode}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {row.collected_at ? new Date(row.collected_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.collected_by ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => downloadReceipt(row)} aria-label="Download">
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => printReceipt(row)} aria-label="Print">
                              <Printer className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openEdit(row)} aria-label="Edit">
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">No collections match the selected filters.</p>
              )}
            </div>
          )}

          <Dialog open={!!editRow} onOpenChange={(open) => !open && closeEdit()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Fee Collection</DialogTitle>
              </DialogHeader>
              {editRow && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Receipt {editRow.receipt_number} — {editRow.student_name} — ₹{Number(editRow.amount).toLocaleString()}
                  </p>
                  {editError && (
                    <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{editError}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Payment Mode *</Label>
                    <Select value={editPaymentMode} onValueChange={setEditPaymentMode}>
                      <SelectTrigger>
                        <SelectValue />
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
                  <div className="space-y-2">
                    <Label htmlFor="edit_remarks">Remarks * (compulsory for modification)</Label>
                    <Input
                      id="edit_remarks"
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      placeholder="Enter reason for modification"
                      required
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeEdit} disabled={editLoading}>
                  Cancel
                </Button>
                <Button onClick={handleEditSave} disabled={editLoading}>
                  {editLoading ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
