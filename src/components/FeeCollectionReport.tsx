"use client";

import { useState, useEffect } from "react";
import { getFeeTypeLabel } from "@/lib/utils";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { fetchStandards, fetchAcademicYears } from "@/lib/lov";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
const QUARTERS = [1, 2, 3, 4] as const;

type ReportRow = {
  id: string;
  receipt_number: string;
  student_name?: string;
  student_standard?: string;
  student_division?: string;
  student_roll_number?: number;
  student_gr_no?: string;
  amount: number;
  fee_type: string;
  quarter: number;
  academic_year: string;
  payment_mode: string;
  collection_date: string;
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
  const school = useSchoolSettings();
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [useMonth, setUseMonth] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [quarter, setQuarter] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [students, setStudents] = useState<{ id: string; full_name: string; standard?: string }[]>([]);
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<ReportRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/students?limit=500")
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStandards().then(setStandards).catch(() => setStandards([]));
  }, []);

  useEffect(() => {
    fetchAcademicYears()
      .then((y) => {
        setYears(y.map(({ id, name }) => ({ id, name })));
        const activeName = y.find((x) => x.status === "active")?.name ?? y[0]?.name;
        if (activeName) setAcademicYear((prev) => prev || activeName);
      })
      .catch(() => setYears([]));
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
    if (standardFilter) params.set("standard", standardFilter);

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

  const getReceiptData = async (row: ReportRow) => {
    const res = await fetch(`/api/receipt-data?id=${row.id}`);
    return res.ok ? res.json() : null;
  };

  const printReceipt = (row: ReportRow) => {
    getReceiptData(row).then(async (data) => {
      const d = data ?? {
        receiptNumber: row.receipt_number,
        studentName: row.student_name ?? "—",
        amount: Number(row.amount),
        paymentMode: row.payment_mode,
        quarter: row.quarter,
        academicYear: row.academic_year,
        feeType: row.fee_type,
        collectedAt: new Date(`${row.collection_date}T12:00:00`).toISOString(),
        collectedBy: row.collected_by,
        chequeNumber: row.cheque_number,
        chequeBank: row.cheque_bank,
        chequeDate: row.cheque_date,
        onlineTransactionId: row.online_transaction_id,
        onlineTransactionRef: row.online_transaction_ref,
        standard: row.student_standard,
        division: row.student_division,
        rollNumber: row.student_roll_number,
        grNo: row.student_gr_no,
      };
      const pdfBlob = await generateReceiptPDF({
        receiptNumber: d.receiptNumber,
        studentName: d.studentName,
        amount: d.amount,
        paymentMode: d.paymentMode,
        quarter: d.quarter,
        academicYear: d.academicYear,
        feeType: d.feeType,
        collectedAt: d.collectedAt,
        amountInWords: amountInWords(d.amount),
        collectedBy: d.collectedBy,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: d.chequeNumber,
        chequeBank: d.chequeBank,
        chequeDate: d.chequeDate,
        onlineTransactionId: d.onlineTransactionId,
        onlineTransactionRef: d.onlineTransactionRef,
        schoolName: school.name,
        schoolAddress: school.address,
        schoolLogoUrl: school.logoUrl ?? undefined,
        standard: d.standard,
        division: d.division,
        rollNumber: d.rollNumber,
        grNo: d.grNo,
        totalFees: d.totalFees,
        outstandingAfterPayment: d.outstandingAfterPayment,
      });
      const url = URL.createObjectURL(pdfBlob);
      const w = window.open(url, "_blank");
      if (w) w.onload = () => w.print();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  };

  const downloadReceipt = (row: ReportRow) => {
    getReceiptData(row).then(async (data) => {
      const d = data ?? {
        receiptNumber: row.receipt_number,
        studentName: row.student_name ?? "—",
        amount: Number(row.amount),
        paymentMode: row.payment_mode,
        quarter: row.quarter,
        academicYear: row.academic_year,
        feeType: row.fee_type,
        collectedAt: new Date(`${row.collection_date}T12:00:00`).toISOString(),
        collectedBy: row.collected_by,
        chequeNumber: row.cheque_number,
        chequeBank: row.cheque_bank,
        chequeDate: row.cheque_date,
        onlineTransactionId: row.online_transaction_id,
        onlineTransactionRef: row.online_transaction_ref,
        standard: row.student_standard,
        division: row.student_division,
        rollNumber: row.student_roll_number,
        grNo: row.student_gr_no,
      };
      const pdfBlob = await generateReceiptPDF({
        receiptNumber: d.receiptNumber,
        studentName: d.studentName,
        amount: d.amount,
        paymentMode: d.paymentMode,
        quarter: d.quarter,
        academicYear: d.academicYear,
        feeType: d.feeType,
        collectedAt: d.collectedAt,
        amountInWords: amountInWords(d.amount),
        collectedBy: d.collectedBy,
        policyNotes: DEFAULT_POLICY_NOTES,
        chequeNumber: d.chequeNumber,
        chequeBank: d.chequeBank,
        chequeDate: d.chequeDate,
        onlineTransactionId: d.onlineTransactionId,
        onlineTransactionRef: d.onlineTransactionRef,
        schoolName: school.name,
        schoolAddress: school.address,
        schoolLogoUrl: school.logoUrl ?? undefined,
        standard: d.standard,
        division: d.division,
        rollNumber: d.rollNumber,
        grNo: d.grNo,
        totalFees: d.totalFees,
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
                <SelectTrigger className="h-9">
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
                <Input className="h-9" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input className="h-9" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input className="h-9" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={academicYear || "all"} onValueChange={(v) => setAcademicYear(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
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
                <SelectTrigger className="h-9">
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
                <SelectTrigger className="h-9">
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
              <Label>Standard</Label>
              <Select value={standardFilter || "all"} onValueChange={(v) => setStandardFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {standards.map((c) => (
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
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} {s.standard ? `(${s.standard})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="h-9" onClick={fetchReport} disabled={loading}>
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
                      <TableHead className="hidden sm:table-cell">Standard</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Qtr</TableHead>
                      <TableHead className="hidden sm:table-cell">Mode</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Collected By</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.flatMap((row) => [
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.receipt_number}</TableCell>
                        <TableCell className="font-medium">
                          {row.student_name ?? "—"}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-8 px-2 sm:hidden"
                            onClick={() =>
                              setExpandedRows((prev) => ({
                                ...prev,
                                [row.id]: !prev[row.id],
                              }))
                            }
                          >
                            {expandedRows[row.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            Details
                          </Button>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {[row.student_standard, row.student_division].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell>{Number(row.amount).toLocaleString()}</TableCell>
                        <TableCell className="hidden sm:table-cell">{getFeeTypeLabel(row.fee_type)}</TableCell>
                        <TableCell className="hidden sm:table-cell">Q{row.quarter}</TableCell>
                        <TableCell className="capitalize hidden sm:table-cell">{row.payment_mode}</TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                          {row.collection_date ? new Date(`${row.collection_date}T12:00:00`).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{row.collected_by ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => downloadReceipt(row)} aria-label="Download">
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => printReceipt(row)} aria-label="Print">
                              <Printer className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>,
                      expandedRows[row.id] ? (
                        <TableRow key={`${row.id}-details`} className="sm:hidden bg-muted/30">
                          <TableCell colSpan={4} className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">Standard:</span> {[row.student_standard, row.student_division].filter(Boolean).join(" ") || "—"}</div>
                            <div><span className="text-muted-foreground">Type:</span> {getFeeTypeLabel(row.fee_type)}</div>
                            <div><span className="text-muted-foreground">Quarter:</span> Q{row.quarter}</div>
                            <div><span className="text-muted-foreground">Mode:</span> {row.payment_mode}</div>
                            <div><span className="text-muted-foreground">Date:</span> {row.collection_date ? new Date(`${row.collection_date}T12:00:00`).toLocaleDateString() : "—"}</div>
                            <div><span className="text-muted-foreground">Collected By:</span> {row.collected_by ?? "—"}</div>
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ])}
                  </TableBody>
                </Table>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">No collections match the selected filters.</p>
              )}
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}
