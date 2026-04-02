"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getFeeTypeLabel } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CalendarRange,
  LayoutGrid,
  GraduationCap,
  User,
  Loader2,
  Filter,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { fetchStandards, fetchAcademicYears } from "@/lib/lov";
import { exportOutstandingPdf } from "@/lib/outstanding-report-export";
import { useSchoolSettings } from "@/hooks/useSchoolSettings";

const QUARTERS = [1, 2, 3, 4] as const;

type OutstandingPreset = "full-year" | "quarterly" | "class-wise" | "student-wise";

const PRESET_CONFIG: {
  value: OutstandingPreset;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { value: "full-year", label: "Full Year", description: "All outstanding for the year", icon: CalendarRange },
  { value: "quarterly", label: "Quarterly", description: "Cumulative till quarter", icon: LayoutGrid },
  { value: "class-wise", label: "Class Wise", description: "By standard/class", icon: GraduationCap },
  { value: "student-wise", label: "Student Wise", description: "Individual student", icon: User },
];

const QUARTER_LABELS: Record<number, string> = {
  1: "Q1 (Apr–Jun)",
  2: "Q2 (Jul–Sep)",
  3: "Q3 (Oct–Dec)",
  4: "Q4 (Jan–Mar)",
};

type OutstandingRow = {
  student_id: string;
  full_name: string;
  standard: string;
  division: string;
  roll_number?: number;
  gr_number?: string;
  quarter: number;
  quarter_label?: string;
  fee_type: string;
  total: number;
  paid: number;
  outstanding: number;
};

type Summary = {
  totalStudents: number;
  totalOutstanding: number;
  totalFees: number;
  totalPaid: number;
};

export default function OutstandingReport() {
  const school = useSchoolSettings();

  const [preset, setPreset] = useState<OutstandingPreset>("full-year");
  const [academicYear, setAcademicYear] = useState("");
  const [quarter, setQuarter] = useState<string>("1");
  const [standardFilter, setStandardFilter] = useState("");
  const [studentId, setStudentId] = useState("");

  const [students, setStudents] = useState<{ id: string; full_name: string; standard?: string }[]>([]);
  const [standards, setStandards] = useState<{ id: string; name: string }[]>([]);
  const [years, setYears] = useState<{ id: string; name: string }[]>([]);

  const [data, setData] = useState<OutstandingRow[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleExpandRow = (key: string) => setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    fetch("/api/students?limit=500&exclude_rte=1")
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
    if (!academicYear) return;
    setLoading(true);
    setData(null);
    setSummary(null);
    const params = new URLSearchParams();
    params.set("academicYear", academicYear);

    switch (preset) {
      case "full-year":
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
    }

    fetch(`/api/outstanding-report?${params}`)
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
  }, [preset, academicYear, quarter, standardFilter, studentId]);

  const canGenerate = useMemo(() => {
    if (!academicYear) return false;
    switch (preset) {
      case "full-year":
      case "quarterly":
        return true;
      case "class-wise":
        return !!standardFilter;
      case "student-wise":
        return !!studentId;
      default:
        return true;
    }
  }, [preset, academicYear, standardFilter, studentId]);

  const buildExportSubtitle = (): string => {
    const parts: string[] = [];
    if (academicYear) parts.push(`Academic year: ${academicYear}`);
    switch (preset) {
      case "full-year":
        parts.push("Full Year");
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
    }
    return parts.join("  ·  ");
  };

  const handleExportPdf = () => {
    if (!data?.length || !summary) return;
    const fileBase = `outstanding-report-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}`;
    exportOutstandingPdf(data, fileBase, {
      schoolName: school.name || "Outstanding Fees Report",
      subtitle: buildExportSubtitle(),
      summary,
    });
  };

  const handleResetAndPreset = (p: OutstandingPreset) => {
    setPreset(p);
    setData(null);
    setSummary(null);
    if (p !== "class-wise" && p !== "student-wise") {
      setStandardFilter("");
      setStudentId("");
    }
    if (p !== "student-wise") {
      setStudentId("");
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 sm:pt-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive sm:h-5 sm:w-5" />
            <h2 className="text-base font-semibold sm:text-lg">Outstanding Fees Report</h2>
          </div>

          {/* Step 1: Report Type Presets */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">What report do you need?</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                <Label className="text-xs">Academic Year <span className="text-destructive">*</span></Label>
                <Select value={academicYear || " "} onValueChange={(v) => setAcademicYear(v === " " ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.id} value={y.name}>{y.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quarter picker — for quarterly preset */}
              {preset === "quarterly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Outstanding Till Quarter</Label>
                  <Select value={quarter || "1"} onValueChange={setQuarter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTERS.map((q) => (
                        <SelectItem key={q} value={String(q)}>{QUARTER_LABELS[q]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Standard picker — for class-wise and student-wise */}
              {(preset === "class-wise" || preset === "student-wise") && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Standard / Class
                    {preset === "class-wise" && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Select value={standardFilter || "all"} onValueChange={(v) => { setStandardFilter(v === "all" ? "" : v); setStudentId(""); }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select standard" />
                    </SelectTrigger>
                    <SelectContent>
                      {preset === "student-wise" && <SelectItem value="all">All Standards</SelectItem>}
                      {standards.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Student picker — for student-wise */}
              {preset === "student-wise" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Student <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Select value={studentId || "all"} onValueChange={(v) => setStudentId(v === "all" ? "" : v)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStudents.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name} {s.standard ? `(${s.standard})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
            {!canGenerate && academicYear && (
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

          {/* Active Filters Summary */}
          {data !== null && !loading && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Filters:</span>
              <Badge variant="secondary" className="text-xs">
                {PRESET_CONFIG.find((p) => p.value === preset)?.label}
              </Badge>
              {academicYear && (
                <Badge variant="outline" className="text-xs">{academicYear}</Badge>
              )}
              {preset === "quarterly" && quarter && (
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
            </div>
          )}

          {/* Summary Cards */}
          {summary && data !== null && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Students with Dues</p>
                <p className="text-xl font-bold sm:text-2xl">{summary.totalStudents}</p>
              </div>
              <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Total Outstanding</p>
                <p className="text-xl font-bold text-destructive sm:text-2xl">₹{summary.totalOutstanding.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Total Fees</p>
                <p className="text-base font-semibold sm:text-lg">₹{summary.totalFees.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg border bg-background p-2.5 space-y-1 sm:p-3">
                <p className="text-[10px] text-muted-foreground sm:text-xs">Total Paid</p>
                <p className="text-base font-semibold text-green-600 sm:text-lg">₹{summary.totalPaid.toLocaleString("en-IN")}</p>
              </div>
            </div>
          )}

          {/* Data Table + Export */}
          {data !== null && !loading && (
            <div className="space-y-3">
              {data.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={handleExportPdf}>
                    <FileText className="h-4 w-4" aria-hidden />
                    Export PDF
                  </Button>
                </div>
              )}
              <div className="border rounded-lg overflow-x-auto">
                {data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="hidden sm:table-cell">GR No.</TableHead>
                        <TableHead className="hidden sm:table-cell">Standard</TableHead>
                        <TableHead className="hidden sm:table-cell">Division</TableHead>
                        <TableHead className="hidden sm:table-cell">Quarter</TableHead>
                        <TableHead className="hidden sm:table-cell">Fee Type</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Total</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Paid</TableHead>
                        <TableHead className="text-right font-semibold">Outstanding</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.flatMap((row, i) => {
                        const rowKey = `${row.student_id}-${row.quarter}-${row.fee_type}-${i}`;
                        return [
                          <TableRow key={rowKey}>
                            <TableCell className="font-medium">
                              {row.full_name}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpandRow(rowKey)}
                                className="ml-1 h-7 px-1.5 sm:hidden"
                              >
                                {expandedRows[rowKey] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                <span className="text-[10px]">Details</span>
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-xs hidden sm:table-cell">{row.gr_number ?? "—"}</TableCell>
                            <TableCell className="hidden sm:table-cell">{row.standard}</TableCell>
                            <TableCell className="hidden sm:table-cell">{row.division || "—"}</TableCell>
                            <TableCell className="hidden sm:table-cell">{row.quarter_label ?? `Q${row.quarter}`}</TableCell>
                            <TableCell className="hidden sm:table-cell">{getFeeTypeLabel(row.fee_type)}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">₹{row.total.toLocaleString("en-IN")}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">₹{row.paid.toLocaleString("en-IN")}</TableCell>
                            <TableCell className="text-right font-semibold text-destructive">
                              ₹{row.outstanding.toLocaleString("en-IN")}
                            </TableCell>
                          </TableRow>,
                          expandedRows[rowKey] ? (
                            <TableRow key={`${rowKey}-details`} className="sm:hidden bg-muted/30">
                              <TableCell colSpan={2} className="text-xs space-y-1">
                                <div><span className="text-muted-foreground">GR No.:</span> {row.gr_number ?? "—"}</div>
                                <div><span className="text-muted-foreground">Standard:</span> {row.standard} {row.division || ""}</div>
                                <div><span className="text-muted-foreground">Quarter:</span> {row.quarter_label ?? `Q${row.quarter}`}</div>
                                <div><span className="text-muted-foreground">Fee Type:</span> {getFeeTypeLabel(row.fee_type)}</div>
                                <div><span className="text-muted-foreground">Total:</span> ₹{row.total.toLocaleString("en-IN")}</div>
                                <div><span className="text-muted-foreground">Paid:</span> <span className="text-green-600">₹{row.paid.toLocaleString("en-IN")}</span></div>
                              </TableCell>
                            </TableRow>
                          ) : null,
                        ];
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="p-6 text-sm text-muted-foreground text-center">
                    {academicYear
                      ? "All fees are up to date for the selected filters."
                      : "Select filters and generate report."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
