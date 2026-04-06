"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { ExcelIcon, PdfIcon } from "@/components/ui/export-icons";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";
import { exportStudentsPdf } from "@/lib/student-report-export";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Filter, LayoutGrid, ListFilter, School, UserCheck, UserRound, X } from "lucide-react";

type StudentReportRow = {
  [key: string]: unknown;
  id: string;
  gr_number?: string | null;
  full_name: string;
  date_of_birth?: string | null;
  gender?: string | null;
  blood_group?: string | null;
  standard?: string | null;
  division?: string | null;
  roll_number?: number | null;
  admission_date?: string | null;
  status?: string | null;
  category?: string | null;
  religion?: string | null;
  caste?: string | null;
  aadhar_no?: string | null;
  pen_no?: string | null;
  apaar_id?: string | null;
  udise_id?: string | null;
  parent_name?: string | null;
  parent_contact?: string | null;
  parent_email?: string | null;
  mother_name?: string | null;
  mother_contact?: string | null;
  father_name?: string | null;
  guardian_name?: string | null;
  guardian_contact?: string | null;
  guardian_email?: string | null;
  present_address_line1?: string | null;
  present_address_line2?: string | null;
  present_city?: string | null;
  present_taluka?: string | null;
  present_district?: string | null;
  present_state?: string | null;
  present_pincode?: string | null;
  present_country?: string | null;
  fee_concession_amount?: number | null;
  fee_concession_reason?: string | null;
  second_language?: string | null;
  mother_tongue?: string | null;
  is_rte_quota?: boolean | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

type AllowedClassNames = { standardName: string; divisionName: string }[];
type ReportPreset = "all" | "class-wise" | "rte-focused" | "status-wise";

const PRESET_CONFIG: {
  value: ReportPreset;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { value: "all", label: "All Students", description: "Whole student base", icon: UserRound },
  { value: "class-wise", label: "Class Wise", description: "Standard/division focus", icon: School },
  { value: "rte-focused", label: "RTE Focused", description: "RTE specific view", icon: UserCheck },
  { value: "status-wise", label: "Status Wise", description: "Active/inactive status", icon: ListFilter },
];

export function StudentReports({ allowedClassNames }: { allowedClassNames?: AllowedClassNames }) {
  const school = useSchoolSettings();
  const supabase = useMemo(() => createClient(), []);
  const restrictByClass = allowedClassNames !== undefined;
  const allowedClassPairsKey = useMemo(() => {
    if (!allowedClassNames?.length) return "";
    return allowedClassNames.map((p) => `${p.standardName}\0${p.divisionName}`).sort().join("|");
  }, [allowedClassNames]);

  const [rows, setRows] = useState<StudentReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<ReportPreset>("all");
  const [standardFilter, setStandardFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [rteFilter, setRteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [generated, setGenerated] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  type SortKey = "full_name" | "standard" | "division" | "roll_number" | "gr_number" | "is_rte_quota" | "status";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("students")
        .select("*")
        .order("standard", { ascending: true })
        .order("division", { ascending: true })
        .order("roll_number", { ascending: true })
        .order("full_name", { ascending: true });

      let fetched = (data ?? []) as StudentReportRow[];
      if (restrictByClass) {
        if (!allowedClassPairsKey) {
          fetched = [];
        } else {
          const allowedPairs = new Set(allowedClassPairsKey.split("|"));
          fetched = fetched.filter((s) => allowedPairs.has(`${s.standard ?? ""}\0${s.division ?? ""}`));
        }
      }
      setRows(fetched);
      setLoading(false);
    })();
  }, [supabase, restrictByClass, allowedClassPairsKey]);

  const standards = useMemo(
    () => Array.from(new Set(rows.map((r) => r.standard).filter(Boolean) as string[])).sort(),
    [rows]
  );
  const divisions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.division).filter(Boolean) as string[])).sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (standardFilter !== "all" && (r.standard ?? "") !== standardFilter) return false;
      if (divisionFilter !== "all" && (r.division ?? "") !== divisionFilter) return false;
      if (rteFilter === "rte" && !r.is_rte_quota) return false;
      if (rteFilter === "non-rte" && !!r.is_rte_quota) return false;
      if (statusFilter !== "all" && (r.status ?? "active") !== statusFilter) return false;
      return true;
    });
  }, [rows, standardFilter, divisionFilter, rteFilter, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedFilteredRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "full_name":
          av = (a.full_name ?? "").toLowerCase();
          bv = (b.full_name ?? "").toLowerCase();
          break;
        case "standard":
          av = (a.standard ?? "").toLowerCase();
          bv = (b.standard ?? "").toLowerCase();
          break;
        case "division":
          av = (a.division ?? "").toLowerCase();
          bv = (b.division ?? "").toLowerCase();
          break;
        case "roll_number":
          av = Number(a.roll_number ?? 0);
          bv = Number(b.roll_number ?? 0);
          break;
        case "gr_number":
          av = (a.gr_number ?? "").toLowerCase();
          bv = (b.gr_number ?? "").toLowerCase();
          break;
        case "is_rte_quota":
          av = a.is_rte_quota ? 1 : 0;
          bv = b.is_rte_quota ? 1 : 0;
          break;
        case "status":
          av = (a.status ?? "").toLowerCase();
          bv = (b.status ?? "").toLowerCase();
          break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortKey, sortDir]);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };
  const reportRows = generated ? sortedFilteredRows : [];

  const handlePresetChange = (next: ReportPreset) => {
    setPreset(next);
    setGenerated(false);
    if (next === "all") {
      setStandardFilter("all");
      setDivisionFilter("all");
      setRteFilter("all");
      setStatusFilter("active");
      return;
    }
    if (next === "class-wise") {
      setRteFilter("all");
      setStatusFilter("active");
      return;
    }
    if (next === "rte-focused") {
      setRteFilter("rte");
      setStatusFilter("active");
      return;
    }
    if (next === "status-wise") {
      setRteFilter("all");
    }
  };

  const canGenerate = useMemo(() => {
    if (preset === "class-wise") return standardFilter !== "all";
    return true;
  }, [preset, standardFilter]);

  const summary = useMemo(() => {
    const total = reportRows.length;
    const active = reportRows.filter((r) => (r.status ?? "active") === "active").length;
    const inactive = reportRows.filter((r) => (r.status ?? "active") !== "active").length;
    const rte = reportRows.filter((r) => !!r.is_rte_quota).length;
    return { total, active, inactive, rte };
  }, [reportRows]);

  const addFormFieldOrder = [
    "standard",
    "division",
    "roll_number",
    "gr_number",
    "full_name",
    "date_of_birth",
    "gender",
    "blood_group",
    "present_address_line1",
    "present_address_line2",
    "present_city",
    "present_taluka",
    "present_district",
    "present_state",
    "present_pincode",
    "present_country",
    "permanent_address_line1",
    "permanent_address_line2",
    "permanent_city",
    "permanent_taluka",
    "permanent_district",
    "permanent_state",
    "permanent_pincode",
    "permanent_country",
    "mother_tongue",
    "admission_date",
    "status",
    "category",
    "religion",
    "caste",
    "birth_place",
    "last_school",
    "previous_school_address",
    "previous_school_state_unique_id",
    "birth_certificate_number",
    "aadhar_no",
    "pen_no",
    "apaar_id",
    "father_name",
    "mother_name",
    "parent_name",
    "parent_contact",
    "mother_contact",
    "parent_email",
    "guardian_name",
    "guardian_contact",
    "guardian_email",
    "emergency_contact_name",
    "emergency_contact_number",
    "fee_concession_amount",
    "fee_concession_reason",
    "height",
    "weight",
    "hobby",
    "sign_of_identity",
    "father_education",
    "father_occupation",
    "mother_education",
    "mother_occupation",
    "whatsapp_no",
    "account_holder_name",
    "bank_name",
    "bank_branch",
    "bank_ifsc",
    "account_no",
    "guardian_education",
    "guardian_occupation",
    "udise_id",
    "second_language",
    "is_rte_quota",
    "id",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by",
    "exit_date",
    "exit_reason",
    "exit_notes",
  ] as const;

  const toLabel = (key: string) =>
    key
      .split("_")
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join(" ");

  const normalizeExportValue = (value: unknown): string | number | boolean => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean" || typeof value === "number") return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const getExportData = () => {
    const rowKeys = Array.from(
      reportRows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>()),
    );

    const orderedKnownKeys = addFormFieldOrder.filter((k) => rowKeys.includes(k)) as string[];
    const extraKeys = rowKeys
      .filter((k) => !orderedKnownKeys.includes(k))
      .sort((a, b) => a.localeCompare(b));
    return { columns: [...orderedKnownKeys, ...extraKeys] };
  };

  const buildFilterSubtitle = () => {
    const parts: string[] = [];
    parts.push(`Preset: ${PRESET_CONFIG.find((p) => p.value === preset)?.label ?? "All Students"}`);
    if (standardFilter !== "all") parts.push(`Standard: ${standardFilter}`);
    if (divisionFilter !== "all") parts.push(`Division: ${divisionFilter}`);
    if (rteFilter === "rte") parts.push("RTE Only");
    else if (rteFilter === "non-rte") parts.push("Non-RTE Only");
    if (statusFilter !== "all") parts.push(`Status: ${statusFilter}`);
    parts.push(`${reportRows.length} student${reportRows.length !== 1 ? "s" : ""}`);
    return parts.join("  ·  ");
  };

  const exportExcel = () => {
    if (reportRows.length === 0) {
      alert("No students match the selected filters.");
      return;
    }
    const { columns } = getExportData();
    const exportRowsFull = reportRows.map((row) => {
      const out: Record<string, string | number | boolean> = {};
      for (const col of columns) {
        out[toLabel(col)] = normalizeExportValue(row[col]);
      }
      return out;
    });

    import("xlsx").then((XLSX) => {
      const ws = XLSX.utils.json_to_sheet(exportRowsFull);

      const colWidths = columns.map((col) => {
        const header = toLabel(col);
        const maxDataLen = reportRows.reduce((max, row) => {
          const val = String(normalizeExportValue(row[col]));
          return Math.max(max, val.length);
        }, header.length);
        return { wch: Math.min(Math.max(maxDataLen + 2, 10), 40) };
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `students-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const exportPdf = () => {
    if (reportRows.length === 0) {
      alert("No students match the selected filters.");
      return;
    }
    const fileBase = `students-report-${new Date().toISOString().slice(0, 10)}`;
    exportStudentsPdf(reportRows, fileBase, {
      schoolName: school.name || "Student Data Report",
      subtitle: buildFilterSubtitle(),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-4 sm:space-y-4 sm:pt-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">What report do you need?</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
          <div className="grid w-full gap-2 grid-cols-2 sm:grid-cols-4 sm:gap-3">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Standard</Label>
              <Select value={standardFilter} onValueChange={setStandardFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {standards.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Division</Label>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {divisions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">RTE Flag</Label>
              <Select value={rteFilter} onValueChange={setRteFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="rte">RTE only</SelectItem>
                  <SelectItem value="non-rte">Non-RTE only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" className="h-10 px-6 gap-2" onClick={() => setGenerated(true)} disabled={!canGenerate || loading}>
              <LayoutGrid className="h-4 w-4" />
              Generate Report
            </Button>
            {!canGenerate && (
              <span className="text-sm text-muted-foreground">Select a standard to generate class-wise report.</span>
            )}
            {generated && (
              <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setGenerated(false)}>
                <X className="h-3.5 w-3.5" />
                Clear Results
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={exportPdf}>
              <PdfIcon className="h-4 w-4" />
              PDF
            </Button>
            <Button type="button" size="sm" className="gap-1.5 bg-green-700 hover:bg-green-800 text-white shadow-sm" onClick={exportExcel}>
              <ExcelIcon className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {generated && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Filters:</span>
            <Badge variant="secondary" className="text-xs">{PRESET_CONFIG.find((p) => p.value === preset)?.label}</Badge>
            {standardFilter !== "all" && <Badge variant="outline" className="text-xs">Std: {standardFilter}</Badge>}
            {divisionFilter !== "all" && <Badge variant="outline" className="text-xs">Div: {divisionFilter}</Badge>}
            {rteFilter === "rte" && <Badge variant="outline" className="text-xs">RTE Only</Badge>}
            {rteFilter === "non-rte" && <Badge variant="outline" className="text-xs">Non-RTE</Badge>}
            {statusFilter !== "all" && <Badge variant="outline" className="text-xs capitalize">Status: {statusFilter}</Badge>}
          </div>
        )}

        {generated && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
              <p className="text-[10px] text-muted-foreground sm:text-xs">Total</p>
              <p className="text-xl font-bold sm:text-2xl">{summary.total}</p>
            </div>
            <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
              <p className="text-[10px] text-muted-foreground sm:text-xs">Active</p>
              <p className="text-xl font-bold text-green-600 sm:text-2xl">{summary.active}</p>
            </div>
            <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
              <p className="text-[10px] text-muted-foreground sm:text-xs">Inactive</p>
              <p className="text-xl font-bold text-muted-foreground sm:text-2xl">{summary.inactive}</p>
            </div>
            <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
              <p className="text-[10px] text-muted-foreground sm:text-xs">RTE</p>
              <p className="text-xl font-bold sm:text-2xl">{summary.rte}</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground py-6">Loading report data...</p>
        ) : generated && reportRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No students match the selected filters.</p>
        ) : generated ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("full_name")}>
                    <span className="inline-flex items-center gap-1">Student Name <SortIcon col="full_name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("standard")}>
                    <span className="inline-flex items-center gap-1">Standard <SortIcon col="standard" /></span>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("division")}>
                    <span className="inline-flex items-center gap-1">Division <SortIcon col="division" /></span>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("roll_number")}>
                    <span className="inline-flex items-center gap-1">Roll # <SortIcon col="roll_number" /></span>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("gr_number")}>
                    <span className="inline-flex items-center gap-1">GR No <SortIcon col="gr_number" /></span>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("is_rte_quota")}>
                    <span className="inline-flex items-center gap-1">RTE <SortIcon col="is_rte_quota" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:text-foreground" onClick={() => handleSort("status")}>
                    <span className="inline-flex items-center gap-1">Status <SortIcon col="status" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportRows.flatMap((row) => [
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.full_name}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(row.id)}
                        className="ml-1 h-7 px-1.5 sm:hidden"
                      >
                        {expandedRows[row.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        <span className="text-[10px]">Details</span>
                      </Button>
                    </TableCell>
                    <TableCell>{row.standard ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{row.division ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{row.roll_number ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs hidden sm:table-cell">{row.gr_number ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">{row.is_rte_quota ? "Yes" : "No"}</TableCell>
                    <TableCell className="capitalize">{row.status ?? "—"}</TableCell>
                  </TableRow>,
                  expandedRows[row.id] ? (
                    <TableRow key={`${row.id}-details`} className="sm:hidden bg-muted/30">
                      <TableCell colSpan={3} className="text-xs space-y-1">
                        <div><span className="text-muted-foreground">Div:</span> {row.division ?? "—"} &middot; <span className="text-muted-foreground">Roll:</span> {row.roll_number ?? "—"}</div>
                        <div><span className="text-muted-foreground">GR No:</span> {row.gr_number ?? "—"}</div>
                        <div><span className="text-muted-foreground">RTE:</span> {row.is_rte_quota ? "Yes" : "No"}</div>
                        {row.parent_contact && <div><span className="text-muted-foreground">Contact:</span> {row.parent_contact}</div>}
                      </TableCell>
                    </TableRow>
                  ) : null,
                ])}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">Choose filters and click Generate Report.</p>
        )}
      </CardContent>
    </Card>
  );
}
