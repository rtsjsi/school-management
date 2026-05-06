"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileText,
  CalendarRange,
  Calendar,
  LayoutGrid,
  Filter,
  Loader2,
  X,
  Edit2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ExpenseEntryForm from "@/components/ExpenseEntryForm";
import { createClient } from "@/lib/supabase/client";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { exportExpensePdf } from "@/lib/expense-report-export";

const PAYMENT_MODES = ["cash", "cheque", "online"] as const;

type ReportType = "list" | "summary";
type FilterPreset = "monthwise" | "yearwise" | "custom";

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
type ListSortKey = "expense_date" | "voucher" | "expense_head" | "party" | "amount" | "account" | "expense_by";
type SummarySortKey = "payment_mode" | "count" | "total";
type SortDir = "asc" | "desc";

const PRESET_CONFIG: {
  value: FilterPreset;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { value: "monthwise", label: "Monthwise", description: "Current Month", icon: LayoutGrid },
  { value: "yearwise", label: "Yearwise", description: "Financial Year", icon: CalendarRange },
  { value: "custom", label: "Custom", description: "Choose range", icon: Filter },
];

function getPresetRange(preset: FilterPreset): { from: string; to: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "monthwise") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toISO(from), to: toISO(to) };
  }
  if (preset === "yearwise") {
    // financial year (Apr-Mar)
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const from = new Date(fyStartYear, 3, 1);
    const to = new Date(fyStartYear + 1, 2, 31);
    return { from: toISO(from), to: toISO(to) };
  }
  
  // custom
  return { from: "", to: "" };
}

export default function ExpenseReports({ canEdit = false }: { canEdit?: boolean }) {
  const school = useSchoolSettings();
  const [reportType] = useState<ReportType>("list");
  const [preset, setPreset] = useState<FilterPreset>("monthwise");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expenseHeadId, setExpenseHeadId] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
  const [search, setSearch] = useState("");
  const [expenseHeads, setExpenseHeads] = useState<ExpenseHead[]>([]);
  const [data, setData] = useState<(ListRow | SummaryRow)[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [listSortKey, setListSortKey] = useState<ListSortKey | null>(null);
  const [summarySortKey, setSummarySortKey] = useState<SummarySortKey | null>(null);
  const [listSortDir, setListSortDir] = useState<SortDir>("asc");
  const [summarySortDir, setSummarySortDir] = useState<SortDir>("asc");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  useEffect(() => {
    const toISO = (d: Date) => d.toISOString().slice(0, 10);
    
    if (preset === "monthwise") {
      const from = new Date(selectedYear, selectedMonth, 1);
      const to = new Date(selectedYear, selectedMonth + 1, 0);
      setFromDate(toISO(from));
      setToDate(toISO(to));
    } else if (preset === "yearwise") {
      // financial year (Apr-Mar)
      const from = new Date(selectedYear, 3, 1);
      const to = new Date(selectedYear + 1, 2, 31);
      setFromDate(toISO(from));
      setToDate(toISO(to));
    }
  }, [preset, selectedMonth, selectedYear]);

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
    fetch(`/api/expense-reports?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  const handleEditClick = async (id: string) => {
    setLoadingEdit(true);
    setEditingId(id);
    setIsDialogOpen(true);
    try {
      const supabase = createClient();
      const { data: row } = await supabase
        .from("expenses")
        .select("*")
        .eq("id", id)
        .single();
      setEditingData(row);
    } catch {
      setIsDialogOpen(false);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setEditingData(null);
    }
  };

  const listRows = useMemo(
    () => (Array.isArray(data) && reportType === "list" ? (data as ListRow[]) : []),
    [data, reportType],
  );
  const summaryRows = useMemo(
    () => (Array.isArray(data) && reportType === "summary" ? (data as SummaryRow[]) : []),
    [data, reportType],
  );
  const sortedListRows = useMemo(() => {
    if (!listSortKey) return listRows;
    return [...listRows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (listSortKey) {
        case "expense_date":
          av = a.expense_date ?? "";
          bv = b.expense_date ?? "";
          break;
        case "voucher":
          av = (a.voucher ?? "").toLowerCase();
          bv = (b.voucher ?? "").toLowerCase();
          break;
        case "expense_head":
          av = (a.expense_head ?? "").toLowerCase();
          bv = (b.expense_head ?? "").toLowerCase();
          break;
        case "party":
          av = (a.party ?? "").toLowerCase();
          bv = (b.party ?? "").toLowerCase();
          break;
        case "amount":
          av = Number(a.amount ?? 0);
          bv = Number(b.amount ?? 0);
          break;
        case "account":
          av = (a.account ?? "").toLowerCase();
          bv = (b.account ?? "").toLowerCase();
          break;
        case "expense_by":
          av = (a.expense_by ?? "").toLowerCase();
          bv = (b.expense_by ?? "").toLowerCase();
          break;
      }
      if (av < bv) return listSortDir === "asc" ? -1 : 1;
      if (av > bv) return listSortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [listRows, listSortDir, listSortKey]);
  const sortedSummaryRows = useMemo(() => {
    if (!summarySortKey) return summaryRows;
    return [...summaryRows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (summarySortKey) {
        case "payment_mode":
          av = (a.payment_mode ?? "").toLowerCase();
          bv = (b.payment_mode ?? "").toLowerCase();
          break;
        case "count":
          av = Number(a.count ?? 0);
          bv = Number(b.count ?? 0);
          break;
        case "total":
          av = Number(a.total ?? 0);
          bv = Number(b.total ?? 0);
          break;
      }
      if (av < bv) return summarySortDir === "asc" ? -1 : 1;
      if (av > bv) return summarySortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [summaryRows, summarySortDir, summarySortKey]);
  const listRowsForExport = useMemo(
    () => sortedListRows.map((r) => ({ ...r, amount: Number(r.amount ?? 0) })),
    [sortedListRows],
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
    exportExpensePdf(listRowsForExport, sortedSummaryRows, fileBase, {
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
  const handleListSort = (key: ListSortKey) => {
    if (listSortKey === key) {
      setListSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setListSortKey(key);
      setListSortDir("asc");
    }
  };
  const handleSummarySort = (key: SummarySortKey) => {
    if (summarySortKey === key) {
      setSummarySortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSummarySortKey(key);
      setSummarySortDir("asc");
    }
  };
  const ListSortIcon = ({ col }: { col: ListSortKey }) => {
    if (listSortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return listSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };
  const SummarySortIcon = ({ col }: { col: SummarySortKey }) => {
    if (summarySortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return summarySortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
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
              {preset === "monthwise" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Month</Label>
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {new Date(2000, i).toLocaleString("default", { month: "long" })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Year</Label>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => (
                          <SelectItem key={i} value={String(new Date().getFullYear() - 2 + i)}>
                            {new Date().getFullYear() - 2 + i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {preset === "yearwise" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Financial Year Starting</Label>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => (
                        <SelectItem key={i} value={String(new Date().getFullYear() - 2 + i)}>
                          {new Date().getFullYear() - 2 + i} - {new Date().getFullYear() - 1 + i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

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

              <div className="space-y-1.5">
                <Label className="text-xs">Search</Label>
                <Input placeholder="Party, voucher, description…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />
              </div>
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
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSummarySort("payment_mode")}>
                        <span className="inline-flex items-center gap-1">Payment Mode <SummarySortIcon col="payment_mode" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSummarySort("count")}>
                        <span className="inline-flex items-center gap-1">Count <SummarySortIcon col="count" /></span>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none hover:text-foreground" onClick={() => handleSummarySort("total")}>
                        <span className="inline-flex items-center gap-1">Total Amount <SummarySortIcon col="total" /></span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSummaryRows.map((row: SummaryRow, i) => (
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
                        {summaryRows.reduce((s, r) => s + Number(r.total ?? 0), 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              {reportType === "list" && Array.isArray(data) && data.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleListSort("expense_date")}>
                        <span className="inline-flex items-center gap-1">Date <ListSortIcon col="expense_date" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleListSort("voucher")}>
                        <span className="inline-flex items-center gap-1">Voucher <ListSortIcon col="voucher" /></span>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleListSort("expense_head")}>
                        <span className="inline-flex items-center gap-1">Head <ListSortIcon col="expense_head" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleListSort("party")}>
                        <span className="inline-flex items-center gap-1">Party <ListSortIcon col="party" /></span>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer select-none hover:text-foreground" onClick={() => handleListSort("amount")}>
                        <span className="inline-flex items-center gap-1">Amount <ListSortIcon col="amount" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleListSort("account")}>
                        <span className="inline-flex items-center gap-1">Mode <ListSortIcon col="account" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleListSort("expense_by")}>
                        <span className="inline-flex items-center gap-1">Expense By <ListSortIcon col="expense_by" /></span>
                      </TableHead>
                      <TableHead className="max-w-[160px] hidden sm:table-cell">Description</TableHead>
                      {canEdit && <TableHead className="w-[80px] text-center">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedListRows.flatMap((row: ListRow) => [
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
                        {canEdit && (
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={() => handleEditClick(String(row.id))}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>,
                      expandedRows[String(row.id ?? "")] ? (
                        <TableRow key={`${String(row.id ?? "")}-details`} className="sm:hidden bg-muted/30">
                          <TableCell colSpan={canEdit ? 4 : 3} className="text-sm space-y-1">
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
                      <TableCell colSpan={canEdit ? 6 : 5} className="hidden sm:table-cell" />
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

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Modify the details of the selected expense record.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4">
            {loadingEdit ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : editingData ? (
              <ExpenseEntryForm 
                expenseHeads={expenseHeads} 
                editingId={editingId}
                onEdit={(id) => {
                  if (id === null) handleDialogClose(false);
                }}
                onSuccess={() => {
                  handleDialogClose(false);
                  fetchReport();
                }}
                initialValues={{
                  voucher: editingData.voucher ?? "",
                  expense_head_id: editingData.expense_head_id ?? "",
                  party: editingData.party ?? "",
                  amount: editingData.amount,
                  expense_by: editingData.expense_by ?? "",
                  account: editingData.account,
                  description: editingData.description ?? "",
                  expense_date: editingData.expense_date,
                  cheque_number: editingData.cheque_number ?? "",
                  cheque_bank: editingData.cheque_bank ?? "",
                  cheque_date: editingData.cheque_date ?? "",
                  transaction_reference_id: editingData.transaction_reference_id ?? "",
                }}
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">Failed to load record details.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
