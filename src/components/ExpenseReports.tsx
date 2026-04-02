"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  CalendarRange,
  Calendar,
  LayoutGrid,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { PdfIcon } from "@/components/ui/export-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { exportExpensePdf } from "@/lib/expense-report-export";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;

type ReportType = "list" | "summary";
type FilterPreset = "today" | "this-month" | "last-month" | "financial-year" | "custom";

type ExpenseHead = { id: string; name: string };
type ListRow = {
  id: string;
  expense_date?: string;
  voucher?: string;
  amount?: number;
  description?: string;
  expense_by?: string;
  account?: string;
  expense_head?: string;
  party?: string;
};
type SummaryRow = { payment_mode: string; count: number; total: number };

const PRESET_CONFIG: {
  value: FilterPreset;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { value: "today", label: "Today", description: "Current day", icon: Calendar },
  { value: "this-month", label: "This Month", description: "Current month", icon: LayoutGrid },
  { value: "last-month", label: "Last Month", description: "Previous month", icon: CalendarRange },
  { value: "financial-year", label: "Financial Year", description: "Apr to Mar", icon: CalendarRange },
  { value: "custom", label: "Custom", description: "Choose date range", icon: Filter },
];

function getPresetRange(preset: FilterPreset): { from: string; to: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "today") return { from: toISO(today), to: toISO(today) };
  if (preset === "this-month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toISO(from), to: toISO(to) };
  }
  if (preset === "last-month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISO(from), to: toISO(to) };
  }
  // financial year (Apr-Mar)
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const from = new Date(fyStartYear, 3, 1);
  const to = new Date(fyStartYear + 1, 2, 31);
  return { from: toISO(from), to: toISO(to) };
}

export default function ExpenseReports() {
  const school = useSchoolSettings();
  const [reportType, setReportType] = useState<ReportType>("list");
  const [preset, setPreset] = useState<FilterPreset>("this-month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expenseHeadId, setExpenseHeadId] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [data, setData] = useState<(ListRow | SummaryRow)[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const range = getPresetRange(preset);
    if (preset !== "custom") {
      setFromDate(range.from);
      setToDate(range.to);
    }
  }, [preset]);

  useEffect(() => {
    createClient()
      .from("expense_heads")
      .select("id, name")
      .order("sort_order")
      .then(({ data: heads }) => setExpenseHeads((heads ?? []) as ExpenseHead[]));
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", reportType);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    if (expenseHeadId && expenseHeadId !== "all") params.set("expenseHeadId", expenseHeadId);
    if (paymentMode && paymentMode !== "all") params.set("paymentMode", paymentMode);
    if (search.trim()) params.set("search", search.trim());
    if (minAmount.trim()) params.set("minAmount", minAmount.trim());
    if (maxAmount.trim()) params.set("maxAmount", maxAmount.trim());
    fetch(`/api/expense-reports?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  const listRows = useMemo(
    () => (Array.isArray(data) && reportType === "list" ? (data as ListRow[]) : []),
    [data, reportType],
  );
  const summaryRows = useMemo(
    () => (Array.isArray(data) && reportType === "summary" ? (data as SummaryRow[]) : []),
    [data, reportType],
  );

  const totalAmount = Array.isArray(data)
    ? data.reduce((s, r) => s + Number((r as ListRow).amount ?? (r as SummaryRow).total ?? 0), 0)
    : 0;

  const canGenerate = useMemo(() => {
    if (preset === "custom") return !!fromDate && !!toDate;
    return true;
  }, [preset, fromDate, toDate]);

  const buildExportSubtitle = () => {
    const parts: string[] = [];
    parts.push(`Period: ${fromDate || "—"} to ${toDate || "—"}`);
    parts.push(`Report: ${reportType === "list" ? "Detailed List" : "By Payment Mode"}`);
    if (expenseHeadId !== "all") {
      const h = expenseHeads.find((x) => x.id === expenseHeadId);
      if (h) parts.push(`Head: ${h.name}`);
    }
    if (paymentMode !== "all") parts.push(`Mode: ${paymentMode}`);
    if (search.trim()) parts.push(`Search: ${search.trim()}`);
    if (minAmount.trim()) parts.push(`Min: ${minAmount}`);
    if (maxAmount.trim()) parts.push(`Max: ${maxAmount}`);
    return parts.join("  ·  ");
  };

  const handleExportPdf = () => {
    if (!data?.length) return;
    const fileBase = `expense-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;
    exportExpensePdf(listRows, summaryRows, fileBase, {
      schoolName: school.name || "Expense Report",
      subtitle: buildExportSubtitle(),
      reportType,
    });
  };

  const handlePresetChange = (next: FilterPreset) => {
    setPreset(next);
    setData(null);
    setExpandedRows({});
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Expense Report</h2>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">Quick date filter</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {PRESET_CONFIG.map(({ value, label, description, icon: Icon }) => {
                const active = preset === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePresetChange(value)}
                    className={`group relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-accent/50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`} />
                    <span className={`text-sm font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}>{label}</span>
                    <span className="text-[11px] leading-tight text-muted-foreground hidden sm:block">{description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" />
              Report Parameters
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Report Type</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">Detailed List</SelectItem>
                    <SelectItem value="summary">By Payment Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {preset === "custom" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">From Date</Label>
                    <DatePicker value={fromDate} onChange={setFromDate} className="h-9 w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To Date</Label>
                    <DatePicker value={toDate} onChange={setToDate} className="h-9 w-full" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Expense Head</Label>
                <Select value={expenseHeadId} onValueChange={setExpenseHeadId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {expenseHeads.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {reportType === "list" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Search</Label>
                    <Input placeholder="Party, voucher, description…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min Amount</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max Amount</Label>
                    <Input type="number" min="0" step="0.01" placeholder="Any" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-9" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button className="h-10 px-6 gap-2" onClick={fetchReport} disabled={loading || !canGenerate}>
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" />Generating…</>) : "Generate Report"}
            </Button>
            {data !== null && !loading && (
              <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setData(null); }}>
                <X className="h-3.5 w-3.5" />
                Clear Results
              </Button>
            )}
          </div>

          {data !== null && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Filters:</span>
              <Badge variant="secondary" className="text-xs">{PRESET_CONFIG.find((p) => p.value === preset)?.label}</Badge>
              <Badge variant="outline" className="text-xs">{reportType === "list" ? "Detailed List" : "By Payment Mode"}</Badge>
              <Badge variant="outline" className="text-xs">{fromDate} to {toDate}</Badge>
              {expenseHeadId !== "all" && <Badge variant="outline" className="text-xs">{expenseHeads.find((h) => h.id === expenseHeadId)?.name ?? "Head"}</Badge>}
              {paymentMode !== "all" && <Badge variant="outline" className="text-xs capitalize">{paymentMode}</Badge>}
            </div>
          )}

          {data !== null && (
            <div className="space-y-3">
              {Array.isArray(data) && data.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={handleExportPdf}>
                    <PdfIcon className="h-4 w-4" aria-hidden />
                    PDF
                  </Button>
                </div>
              )}
              <div className="border rounded-lg overflow-x-auto">
              {reportType === "summary" && Array.isArray(data) && data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryRows.map((row: SummaryRow, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize">{row.payment_mode ?? "—"}</TableCell>
                        <TableCell>{Number(row.count ?? 0)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(row.total ?? 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium bg-muted/50">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">
                        {data.reduce((s, r) => s + Number(r.total ?? 0), 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              {reportType === "list" && Array.isArray(data) && data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="hidden sm:table-cell">Voucher</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead className="hidden sm:table-cell">Party</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Mode</TableHead>
                      <TableHead className="hidden sm:table-cell">Expense By</TableHead>
                      <TableHead className="max-w-[160px] hidden sm:table-cell">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listRows.flatMap((row: ListRow) => [
                      <TableRow key={String(row.id ?? "")}>
                        <TableCell className="text-sm">
                          {row.expense_date
                            ? new Date(row.expense_date as string).toLocaleDateString()
                            : "—"}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-8 px-2 sm:hidden"
                            onClick={() =>
                              setExpandedRows((prev) => ({
                                ...prev,
                                [String(row.id ?? "")]: !prev[String(row.id ?? "")],
                              }))
                            }
                          >
                            {expandedRows[String(row.id ?? "")] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            Details
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs hidden sm:table-cell">{String(row.voucher ?? "—")}</TableCell>
                        <TableCell>{String(row.expense_head ?? "—")}</TableCell>
                        <TableCell className="hidden sm:table-cell">{String(row.party ?? "—")}</TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(row.amount ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize hidden sm:table-cell">{String(row.account ?? "—")}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{String(row.expense_by ?? "—")}</TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[160px] hidden sm:table-cell">
                          {String(row.description ?? "—")}
                        </TableCell>
                      </TableRow>,
                      expandedRows[String(row.id ?? "")] ? (
                        <TableRow key={`${String(row.id ?? "")}-details`} className="sm:hidden bg-muted/30">
                          <TableCell colSpan={3} className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">Voucher:</span> {String(row.voucher ?? "—")}</div>
                            <div><span className="text-muted-foreground">Party:</span> {String(row.party ?? "—")}</div>
                            <div><span className="text-muted-foreground">Mode:</span> {String(row.account ?? "—")}</div>
                            <div><span className="text-muted-foreground">Expense By:</span> {String(row.expense_by ?? "—")}</div>
                            <div><span className="text-muted-foreground">Description:</span> {String(row.description ?? "—")}</div>
                          </TableCell>
                        </TableRow>
                      ) : null,
                    ])}
                    <TableRow className="font-medium bg-muted/50">
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">{totalAmount.toLocaleString()}</TableCell>
                      <TableCell colSpan={5} className="hidden sm:table-cell" />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              {Array.isArray(data) && data.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground text-center">No data for this report.</p>
              )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
