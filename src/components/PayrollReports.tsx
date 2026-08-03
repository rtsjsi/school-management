"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  UserX,
  Wallet,
  TreePalm,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  exportPayrollReportExcel,
  exportPayrollReportPdf,
  type PayrollPdfColumn,
} from "@/lib/payroll-report-export";

type ReportType = "monthly" | "absent" | "casual-leave" | "salary";

type StaffOption = { id: string; full_name: string; employee_id: string | null };

type ColDef = {
  key: string;
  header: string;
  align?: "left" | "right";
  format?: (v: unknown, row: Record<string, unknown>) => string;
};

const REPORT_PRESETS: {
  value: ReportType;
  label: string;
  description: string;
  icon: typeof CalendarDays;
}[] = [
  {
    value: "monthly",
    label: "Monthly Attendance",
    description: "Payable days & deductions",
    icon: CalendarDays,
  },
  {
    value: "absent",
    label: "Absentee List",
    description: "Who was absent on a date",
    icon: UserX,
  },
  {
    value: "casual-leave",
    label: "Casual Leave",
    description: "CL opening / used / closing",
    icon: TreePalm,
  },
  {
    value: "salary",
    label: "Salary Summary",
    description: "Present days & net pay",
    icon: Wallet,
  },
];

const MONTHLY_COLS: ColDef[] = [
  { key: "employee_id", header: "Emp ID" },
  { key: "employee_name", header: "Employee" },
  { key: "attendance_days", header: "Attendance days", align: "right" },
  { key: "present", header: "Payable days", align: "right" },
  { key: "sandwich_deduction", header: "Sandwich −", align: "right" },
  {
    key: "late_in_deduction",
    header: "Late IN (−days)",
    align: "right",
    format: (v, row) => {
      const days = Number(v ?? 0);
      const count = Number(row.late_in_count ?? 0);
      return count > 0 ? `${days} (${count}×)` : String(days);
    },
  },
  { key: "casual_leave_used", header: "CL used", align: "right" },
  { key: "salary_deduction_days", header: "Salary deduction days", align: "right" },
  { key: "absent", header: "Absent", align: "right" },
  {
    key: "percentage",
    header: "%",
    align: "right",
    format: (v) => `${Number(v ?? 0).toFixed(1)}%`,
  },
];

const ABSENT_COLS: ColDef[] = [
  { key: "employee_id", header: "Emp ID" },
  { key: "employee_name", header: "Employee" },
];

const CL_COLS: ColDef[] = [
  { key: "employee_id", header: "Emp ID" },
  { key: "employee_name", header: "Name" },
  { key: "role", header: "Role" },
  { key: "opening_balance", header: "Opening CL", align: "right" },
  { key: "days_used", header: "Used this month", align: "right" },
  { key: "closing_balance", header: "Closing balance", align: "right" },
  { key: "status", header: "Status" },
];

const SALARY_COLS: ColDef[] = [
  { key: "employee_code", header: "Emp ID" },
  { key: "full_name", header: "Employee" },
  { key: "attendance_days", header: "Attendance days", align: "right" },
  { key: "present_days", header: "Payable days", align: "right" },
  { key: "sandwich_deduction", header: "Sandwich −", align: "right" },
  { key: "late_in_deduction", header: "Late IN (−days)", align: "right" },
  { key: "casual_leave_used", header: "CL used", align: "right" },
  { key: "salary_deduction_days", header: "Salary deduction days", align: "right" },
  {
    key: "net_amount",
    header: "Net (₹)",
    align: "right",
    format: (v) => `₹${Math.round(Number(v ?? 0)).toLocaleString("en-IN")}`,
  },
];

function cellValue(col: ColDef, row: Record<string, unknown>): string {
  if (col.format) return col.format(row[col.key], row);
  const v = row[col.key];
  if (v == null || v === "") return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v);
}

export default function PayrollReports() {
  const school = useSchoolSettings();
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [usedOnly, setUsedOnly] = useState(false);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [summary, setSummary] = useState<{ label: string; value: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("employees")
      .select("id, full_name, employee_id")
      .eq("status", "active")
      .eq("enable_payroll", true)
      .order("full_name")
      .then(({ data: rows }) => {
        setStaff((rows as StaffOption[]) ?? []);
      });
  }, []);

  const columns = useMemo(() => {
    switch (reportType) {
      case "monthly":
        return MONTHLY_COLS;
      case "absent":
        return ABSENT_COLS;
      case "casual-leave":
        return CL_COLS;
      case "salary":
        return SALARY_COLS;
    }
  }, [reportType]);

  const canGenerate = useMemo(() => {
    if (reportType === "absent") return !!date;
    return !!month && /^\d{4}-\d{2}$/.test(month);
  }, [reportType, month, date]);

  const resetResults = useCallback(() => {
    setData(null);
    setSummary([]);
    setError(null);
    setSortKey(null);
  }, []);

  const handlePreset = (value: ReportType) => {
    setReportType(value);
    resetResults();
  };

  const fetchReport = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSummary([]);
    setSortKey(null);

    try {
      if (reportType === "monthly" || reportType === "absent") {
        const params = new URLSearchParams({ type: reportType });
        if (reportType === "monthly") {
          params.set("month", month);
          if (employeeId !== "all") params.set("employeeId", employeeId);
        } else {
          params.set("date", date);
        }
        const res = await fetch(`/api/attendance-reports?${params}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Failed to load report.");
          setData([]);
          return;
        }
        const rows = (json.data ?? []) as Record<string, unknown>[];
        setData(rows);
        if (reportType === "monthly") {
          const totalPayable = rows.reduce((s, r) => s + Number(r.present ?? 0), 0);
          const totalCl = rows.reduce((s, r) => s + Number(r.casual_leave_used ?? 0), 0);
          const totalDed = rows.reduce((s, r) => s + Number(r.salary_deduction_days ?? 0), 0);
          setSummary([
            { label: "Staff", value: String(rows.length) },
            { label: "Total payable days", value: totalPayable.toFixed(1) },
            { label: "CL used", value: totalCl.toFixed(1) },
            { label: "Salary deduction days", value: totalDed.toFixed(1) },
          ]);
        } else {
          setSummary([{ label: "Absent", value: String(rows.length) }]);
        }
        return;
      }

      if (reportType === "casual-leave") {
        const params = new URLSearchParams({ month });
        if (employeeId !== "all") params.set("employeeId", employeeId);
        if (usedOnly) params.set("usedOnly", "true");
        const res = await fetch(`/api/casual-leave-report?${params}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Failed to load casual leave report.");
          setData([]);
          return;
        }
        const rows = (json.data ?? []) as Record<string, unknown>[];
        setData(rows);
        const s = json.summary ?? {};
        setSummary([
          { label: "Staff", value: String(s.staff_count ?? rows.length) },
          { label: "Total CL used", value: String(s.total_cl_used ?? 0) },
          { label: "Zero balance", value: String(s.zero_balance_count ?? 0) },
        ]);
        return;
      }

      // salary summary via NEFT preview
      const params = new URLSearchParams({ monthYear: month, format: "json" });
      const res = await fetch(`/api/neft?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load salary summary.");
        setData([]);
        return;
      }
      let rows = (json.summaryRows ?? json.rows ?? []) as Record<string, unknown>[];
      if (employeeId !== "all") {
        rows = rows.filter((r) => String(r.employee_id) === employeeId);
      }
      setData(rows);
      const totalNet = rows.reduce((s, r) => s + Math.round(Number(r.net_amount ?? 0)), 0);
      const totalPayable = rows.reduce((s, r) => s + Number(r.present_days ?? 0), 0);
      setSummary([
        { label: "Staff", value: String(rows.length) },
        { label: "Total payable days", value: totalPayable.toFixed(1) },
        { label: "Total net pay", value: `₹${totalNet.toLocaleString("en-IN")}` },
      ]);
    } catch {
      setError("Failed to load report.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
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
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = typeof av === "number" ? av : String(av ?? "").toLowerCase();
      const bn = typeof bv === "number" ? bv : String(bv ?? "").toLowerCase();
      if (an < bn) return sortDir === "asc" ? -1 : 1;
      if (an > bn) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const reportTitle = REPORT_PRESETS.find((p) => p.value === reportType)?.label ?? "Payroll Report";

  const filterSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (reportType === "absent") parts.push(`Date: ${date}`);
    else parts.push(`Month: ${month}`);
    if (employeeId !== "all") {
      const emp = staff.find((s) => s.id === employeeId);
      parts.push(`Employee: ${emp?.full_name ?? employeeId}`);
    }
    if (reportType === "casual-leave" && usedOnly) parts.push("Used this month only");
    return parts.join(" · ");
  }, [reportType, date, month, employeeId, staff, usedOnly]);

  const exportColumns: PayrollPdfColumn[] = columns.map((c) => ({
    key: c.key,
    header: c.header,
    width: 14,
  }));

  const exportRows = useMemo(() => {
    if (!data) return [];
    return data.map((row) => {
      const out: Record<string, unknown> = {};
      for (const col of columns) {
        out[col.key] = col.format ? col.format(row[col.key], row) : row[col.key];
      }
      return out;
    });
  }, [data, columns]);

  const fileBase = `payroll-${reportType}-${reportType === "absent" ? date : month}`;

  const handlePdf = () => {
    if (!data?.length) return;
    setExporting("pdf");
    try {
      exportPayrollReportPdf({
        title: reportTitle,
        schoolName: school.name,
        subtitle: filterSubtitle,
        fileBase,
        columns: exportColumns,
        rows: exportRows,
        summary,
      });
    } finally {
      setExporting(null);
    }
  };

  const handleExcel = async () => {
    if (!data?.length) return;
    setExporting("excel");
    try {
      await exportPayrollReportExcel({
        sheetName: reportTitle,
        fileBase,
        columns: exportColumns,
        rows: exportRows,
      });
    } finally {
      setExporting(null);
    }
  };

  const showEmployeeFilter = reportType !== "absent";

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">What report do you need?</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {REPORT_PRESETS.map(({ value, label, description, icon: Icon }) => {
              const active = reportType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePreset(value)}
                  className={`group relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${
                    active
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-background hover:border-primary/40 hover:bg-accent/50"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"}`}
                  />
                  <span className={`text-sm font-medium leading-tight ${active ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </span>
                  <span className="text-[11px] leading-tight text-muted-foreground hidden sm:block">
                    {description}
                  </span>
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
          <div className="flex flex-wrap gap-4 items-end">
            {reportType === "absent" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker value={date} onChange={(v) => { setDate(v); resetResults(); }} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Month <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="h-9 w-[180px]"
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    resetResults();
                  }}
                />
              </div>
            )}

            {showEmployeeFilter && (
              <div className="space-y-1.5">
                <Label className="text-xs">Employee</Label>
                <Select
                  value={employeeId}
                  onValueChange={(v) => {
                    setEmployeeId(v);
                    resetResults();
                  }}
                >
                  <SelectTrigger className="h-9 w-[220px]">
                    <SelectValue placeholder="All staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All staff</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                        {s.employee_id ? ` (${s.employee_id})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === "casual-leave" && (
              <label className="flex items-center gap-2 h-9 text-sm cursor-pointer">
                <Checkbox
                  checked={usedOnly}
                  onCheckedChange={(c) => {
                    setUsedOnly(c === true);
                    resetResults();
                  }}
                />
                Used this month only
              </label>
            )}

            <Button className="h-9 px-6 gap-2" onClick={fetchReport} disabled={loading || !canGenerate}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {data && data.length > 0 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {summary.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-md border bg-background px-3 py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground">{s.label}: </span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!!exporting}
                  onClick={handlePdf}
                >
                  {exporting === "pdf" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={!!exporting}
                  onClick={handleExcel}
                >
                  {exporting === "excel" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  )}
                  Excel
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={`cursor-pointer select-none hover:text-foreground whitespace-nowrap ${
                          col.align === "right" ? "text-right" : ""
                        }`}
                        onClick={() => handleSort(col.key)}
                      >
                        <span
                          className={`inline-flex items-center gap-1 ${
                            col.align === "right" ? "justify-end w-full" : ""
                          }`}
                        >
                          {col.header} <SortIcon col={col.key} />
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sortedData ?? []).map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={`whitespace-nowrap ${
                            col.align === "right" ? "text-right tabular-nums" : ""
                          } ${col.key.includes("name") || col.key === "full_name" ? "font-medium" : ""}`}
                        >
                          {cellValue(col, row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {data && data.length === 0 && !error && (
          <p className="text-sm text-muted-foreground py-8 text-center">No data for this report.</p>
        )}

        {data === null && !loading && !error && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Choose a report type and parameters, then click Generate Report.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
