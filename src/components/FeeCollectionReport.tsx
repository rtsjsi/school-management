"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatFeeCollectionDisplayDate, getFeeTypeLabel } from "@/lib/utils";
import { generateReceiptPDF, amountInWords } from "@/lib/receipt-pdf";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  FileDown,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarRange,
  Calendar,
  LayoutGrid,
  GraduationCap,
  User,
  Loader2,
  IndianRupee,
  Banknote,
  CreditCard,
  Smartphone,
  Filter,
  X,
} from "lucide-react";
import { exportFeeCollectionPdf } from "@/lib/fee-collection-report-export";
import { fetchStandards, fetchAcademicYears } from "@/lib/lov";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;
const QUARTERS = [1, 2, 3, 4] as const;

type ReportPreset = "full-year" | "monthly" | "quarterly" | "class-wise" | "student-wise" | "custom";

const PRESET_CONFIG: {
  value: ReportPreset;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { value: "full-year", label: "Full Year", description: "Entire academic year", icon: CalendarRange },
  { value: "monthly", label: "Monthly", description: "Single month view", icon: Calendar },
  { value: "quarterly", label: "Quarterly", description: "By quarter (Q1–Q4)", icon: LayoutGrid },
  { value: "class-wise", label: "Class Wise", description: "By standard/class", icon: GraduationCap },
  { value: "student-wise", label: "Student Wise", description: "Individual student", icon: User },
  { value: "custom", label: "Custom", description: "Date range & filters", icon: Filter },
];

const QUARTER_LABELS: Record<number, string> = {
  1: "Q1 (Apr–Jun)",
  2: "Q2 (Jul–Sep)",
  3: "Q3 (Oct–Dec)",
  4: "Q4 (Jan–Mar)",
};

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

const PAYMENT_MODE_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  cheque: CreditCard,
  online: Smartphone,
};

function PaymentModeChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
          !value
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
      >
        <IndianRupee className="h-3.5 w-3.5" />
        All Modes
      </button>
      {PAYMENT_MODES.map((mode) => {
        const Icon = PAYMENT_MODE_ICONS[mode] ?? Banknote;
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(active ? "" : mode)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        );
      })}
    </div>
  );
}

export default function FeeCollectionReport() {
  const school = useSchoolSettings();
  const today = new Date().toISOString().split("T")[0];

  const [preset, setPreset] = useState<ReportPreset>("full-year");
  const [academicYear, setAcademicYear] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [quarter, setQuarter] = useState<string>("1");
  const [standardFilter, setStandardFilter] = useState("");
  const [studentId, setStudentId] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [students, setStudents] = useState<{ id: string; full_name: string; standard?: string }[]>([]);
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);

  const [data, setData] = useState<ReportRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  type SortKey = "receipt_number" | "student_name" | "student_standard" | "amount" | "fee_type" | "quarter" | "payment_mode" | "collection_date" | "collected_by";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!data || !sortKey) return data;
    return [...data].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "receipt_number": av = a.receipt_number ?? ""; bv = b.receipt_number ?? ""; break;
        case "student_name": av = (a.student_name ?? "").toLowerCase(); bv = (b.student_name ?? "").toLowerCase(); break;
        case "student_standard": av = a.student_standard ?? ""; bv = b.student_standard ?? ""; break;
        case "amount": av = Number(a.amount); bv = Number(b.amount); break;
        case "fee_type": av = a.fee_type ?? ""; bv = b.fee_type ?? ""; break;
        case "quarter": av = a.quarter; bv = b.quarter; break;
        case "payment_mode": av = a.payment_mode ?? ""; bv = b.payment_mode ?? ""; break;
        case "collection_date": av = a.collection_date ?? ""; bv = b.collection_date ?? ""; break;
        case "collected_by": av = (a.collected_by ?? "").toLowerCase(); bv = (b.collected_by ?? "").toLowerCase(); break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

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

  const filteredStudents = useMemo(() => {
    if (!standardFilter) return students;
    return students.filter((s) => s.standard === standardFilter);
  }, [students, standardFilter]);

  const fetchReport = useCallback(() => {
    setLoading(true);
    setData(null);
    setSummary(null);
    setSortKey(null);
    const params = new URLSearchParams();

    if (academicYear) params.set("academicYear", academicYear);
    if (paymentMode) params.set("paymentMode", paymentMode);

    switch (preset) {
      case "full-year":
        break;
      case "monthly":
        params.set("month", month);
        break;
      case "quarterly":
        if (quarter) params.set("quarter", quarter);
        break;
      case "class-wise":
        if (standardFilter) params.set("standard", standardFilter);
        break;
      case "student-wise":
        if (standardFilter) params.set("standard", standardFilter);
        if (studentId) params.set("studentId", studentId);
        break;
      case "custom":
        params.set("dateFrom", dateFrom);
        params.set("dateTo", dateTo);
        if (quarter) params.set("quarter", quarter);
        if (standardFilter) params.set("standard", standardFilter);
        if (studentId) params.set("studentId", studentId);
        break;
    }

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
  }, [preset, academicYear, month, quarter, standardFilter, studentId, paymentMode, dateFrom, dateTo]);

  const canGenerate = useMemo(() => {
    switch (preset) {
      case "full-year":
      case "monthly":
      case "quarterly":
      case "custom":
        return true;
      case "class-wise":
        return !!standardFilter;
      case "student-wise":
        return !!studentId;
      default:
        return true;
    }
  }, [preset, standardFilter, studentId]);

  const exportFileBase = () =>
    `fee-collections-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;

  const buildExportSubtitle = (): string => {
    const parts: string[] = [];
    if (academicYear) parts.push(`Academic year: ${academicYear}`);
    switch (preset) {
      case "full-year":
        parts.push("Full Year");
        break;
      case "monthly":
        parts.push(`Month: ${month}`);
        break;
      case "quarterly":
        parts.push(`Quarter: ${QUARTER_LABELS[Number(quarter)] ?? `Q${quarter}`}`);
        break;
      case "class-wise":
        if (standardFilter) parts.push(`Standard: ${standardFilter}`);
        break;
      case "student-wise": {
        if (standardFilter) parts.push(`Standard: ${standardFilter}`);
        const s = students.find((x) => x.id === studentId);
        if (s) parts.push(`Student: ${s.full_name}`);
        break;
      }
      case "custom":
        parts.push(`Period: ${dateFrom} to ${dateTo}`);
        break;
    }
    if (paymentMode) parts.push(`Payment: ${paymentMode}`);
    return parts.join("  ·  ");
  };

  const handleExportPdf = () => {
    if (!data?.length || !summary) return;
    exportFeeCollectionPdf(data, exportFileBase(), {
      schoolName: school.name || "Fee Collection Report",
      subtitle: buildExportSubtitle(),
      summary,
    });
  };

  const getReceiptData = async (row: ReportRow) => {
    const res = await fetch(`/api/receipt-data?id=${row.id}`);
    return res.ok ? res.json() : null;
  };

  const buildReceiptPayload = (row: ReportRow, d: Record<string, unknown> | null) => {
    const fallback = {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = d ?? fallback;
    return {
      receiptNumber: r.receiptNumber,
      studentName: r.studentName,
      amount: r.amount,
      paymentMode: r.paymentMode,
      quarter: r.quarter,
      academicYear: r.academicYear,
      feeType: r.feeType,
      collectedAt: r.collectedAt,
      amountInWords: amountInWords(r.amount),
      collectedBy: r.collectedBy,
      policyNotes: DEFAULT_POLICY_NOTES,
      chequeNumber: r.chequeNumber,
      chequeBank: r.chequeBank,
      chequeDate: r.chequeDate,
      onlineTransactionId: r.onlineTransactionId,
      onlineTransactionRef: r.onlineTransactionRef,
      schoolName: school.name,
      schoolAddress: school.address,
      schoolLogoUrl: school.logoUrl ?? undefined,
      standard: r.standard,
      division: r.division,
      rollNumber: r.rollNumber,
      grNo: r.grNo,
      totalFees: r.totalFees,
      outstandingAfterPayment: r.outstandingAfterPayment,
    };
  };

  const printReceipt = (row: ReportRow) => {
    getReceiptData(row).then(async (apiData) => {
      const pdfBlob = await generateReceiptPDF(buildReceiptPayload(row, apiData));
      const url = URL.createObjectURL(pdfBlob);
      const w = window.open(url, "_blank");
      if (w) w.onload = () => w.print();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
  };

  const downloadReceipt = (row: ReportRow) => {
    getReceiptData(row).then(async (apiData) => {
      const pdfBlob = await generateReceiptPDF(buildReceiptPayload(row, apiData));
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${row.receipt_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleResetAndPreset = (p: ReportPreset) => {
    setPreset(p);
    setData(null);
    setSummary(null);
    if (p !== "class-wise" && p !== "student-wise" && p !== "custom") {
      setStandardFilter("");
      setStudentId("");
    }
    if (p !== "student-wise" && p !== "custom") {
      setStudentId("");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Fees Collection Report</h2>
          </div>

          {/* Step 1: Report Type Presets */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">What report do you need?</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {PRESET_CONFIG.map(({ value, label, description, icon: Icon }) => {
                const active = preset === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleResetAndPreset(value)}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-accent/50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`} />
                    <span className={`text-sm font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}>
                      {label}
                    </span>
                    <span className="text-[11px] leading-tight text-muted-foreground hidden sm:block">{description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Contextual Parameters */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Report Parameters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Academic Year — always visible */}
              <div className="space-y-1.5">
                <Label className="text-xs">Academic Year</Label>
                <Select value={academicYear || "all"} onValueChange={(v) => setAcademicYear(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.name}>{y.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month picker — only for monthly preset */}
              {preset === "monthly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Month</Label>
                  <Input className="h-9" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
              )}

              {/* Quarter picker — for quarterly and custom */}
              {(preset === "quarterly" || preset === "custom") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Quarter</Label>
                  <Select value={quarter || "all"} onValueChange={(v) => setQuarter(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Quarters" />
                    </SelectTrigger>
                    <SelectContent>
                      {preset === "custom" && <SelectItem value="all">All Quarters</SelectItem>}
                      {QUARTERS.map((q) => (
                        <SelectItem key={q} value={String(q)}>{QUARTER_LABELS[q]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Standard picker — for class-wise, student-wise, and custom */}
              {(preset === "class-wise" || preset === "student-wise" || preset === "custom") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Standard / Class
                    {(preset === "class-wise") && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Select value={standardFilter || "all"} onValueChange={(v) => { setStandardFilter(v === "all" ? "" : v); setStudentId(""); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select standard" />
                    </SelectTrigger>
                    <SelectContent>
                      {preset === "custom" && <SelectItem value="all">All Standards</SelectItem>}
                      {standards.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Student picker — for student-wise and custom */}
              {(preset === "student-wise" || preset === "custom") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Student
                    {preset === "student-wise" && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Select value={studentId || "all"} onValueChange={(v) => setStudentId(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {preset === "custom" && <SelectItem value="all">All Students</SelectItem>}
                      {filteredStudents.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name} {s.standard ? `(${s.standard})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom date range */}
              {preset === "custom" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">From Date</Label>
                    <DatePicker value={dateFrom} onChange={setDateFrom} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To Date</Label>
                    <DatePicker value={dateTo} onChange={setDateTo} className="h-9" />
                  </div>
                </>
              )}
            </div>

            {/* Payment mode chips — always visible */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs">Payment Mode</Label>
              <PaymentModeChips value={paymentMode} onChange={setPaymentMode} />
            </div>
          </div>

          {/* Generate button */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="h-10 px-6 gap-2"
              onClick={fetchReport}
              disabled={loading || !canGenerate}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
            {!canGenerate && (
              <span className="text-sm text-muted-foreground">
                {preset === "class-wise" && "Select a standard to generate the report."}
                {preset === "student-wise" && "Select a student to generate the report."}
              </span>
            )}
            {data !== null && !loading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground"
                onClick={() => { setData(null); setSummary(null); }}
              >
                <X className="h-3.5 w-3.5" />
                Clear Results
              </Button>
            )}
          </div>

          {/* Active Filters Summary (shown when report is generated) */}
          {data !== null && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Filters:</span>
              <Badge variant="secondary" className="text-xs">
                {PRESET_CONFIG.find((p) => p.value === preset)?.label}
              </Badge>
              {academicYear && (
                <Badge variant="outline" className="text-xs">{academicYear}</Badge>
              )}
              {preset === "monthly" && (
                <Badge variant="outline" className="text-xs">{month}</Badge>
              )}
              {(preset === "quarterly" || preset === "custom") && quarter && (
                <Badge variant="outline" className="text-xs">{QUARTER_LABELS[Number(quarter)] ?? `Q${quarter}`}</Badge>
              )}
              {standardFilter && (
                <Badge variant="outline" className="text-xs">Std: {standardFilter}</Badge>
              )}
              {studentId && (
                <Badge variant="outline" className="text-xs">
                  {students.find((s) => s.id === studentId)?.full_name ?? "Student"}
                </Badge>
              )}
              {paymentMode && (
                <Badge variant="outline" className="text-xs capitalize">{paymentMode}</Badge>
              )}
            </div>
          )}

          {/* Summary Cards */}
          {summary && data !== null && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-background p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Total Collections</p>
                <p className="text-2xl font-bold">{summary.totalCount}</p>
              </div>
              <div className="rounded-lg border bg-background p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-green-600">₹{summary.totalAmount.toLocaleString("en-IN")}</p>
              </div>
              {summary.byMode.map((m) => (
                <div key={m.payment_mode} className="rounded-lg border bg-background p-3 space-y-1">
                  <p className="text-xs text-muted-foreground capitalize">{m.payment_mode}</p>
                  <p className="text-lg font-semibold">₹{m.total.toLocaleString("en-IN")}</p>
                  <p className="text-xs text-muted-foreground">{m.count} receipt{m.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          )}

          {/* Data Table + Export */}
          {data !== null && !loading && (
            <div className="space-y-3">
              {data.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={handleExportPdf}>
                    <FileDown className="h-4 w-4" aria-hidden />
                    Export PDF
                  </Button>
                </div>
              )}
              <div className="border rounded-lg overflow-x-auto">
                {data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("receipt_number")}>
                          <span className="inline-flex items-center gap-1">Receipt <SortIcon col="receipt_number" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("student_name")}>
                          <span className="inline-flex items-center gap-1">Student <SortIcon col="student_name" /></span>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("student_standard")}>
                          <span className="inline-flex items-center gap-1">Standard <SortIcon col="student_standard" /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("amount")}>
                          <span className="inline-flex items-center gap-1">Amount <SortIcon col="amount" /></span>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("fee_type")}>
                          <span className="inline-flex items-center gap-1">Type <SortIcon col="fee_type" /></span>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("quarter")}>
                          <span className="inline-flex items-center gap-1">Qtr <SortIcon col="quarter" /></span>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("payment_mode")}>
                          <span className="inline-flex items-center gap-1">Mode <SortIcon col="payment_mode" /></span>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("collection_date")}>
                          <span className="inline-flex items-center gap-1">Date <SortIcon col="collection_date" /></span>
                        </TableHead>
                        <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("collected_by")}>
                          <span className="inline-flex items-center gap-1">Collected By <SortIcon col="collected_by" /></span>
                        </TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(sortedData ?? []).flatMap((row) => [
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
                          <TableCell>{Number(row.amount).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="hidden sm:table-cell">{getFeeTypeLabel(row.fee_type)}</TableCell>
                          <TableCell className="hidden sm:table-cell">Q{row.quarter}</TableCell>
                          <TableCell className="capitalize hidden sm:table-cell">{row.payment_mode}</TableCell>
                          <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                            {formatFeeCollectionDisplayDate(row.collection_date)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{row.collected_by ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 sm:h-8 sm:w-8" onClick={() => downloadReceipt(row)} aria-label="Download receipt">
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 sm:h-8 sm:w-8" onClick={() => printReceipt(row)} aria-label="Print receipt">
                                <Printer className="h-3.5 w-3.5" />
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
                              <div><span className="text-muted-foreground">Date:</span> {formatFeeCollectionDisplayDate(row.collection_date)}</div>
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
